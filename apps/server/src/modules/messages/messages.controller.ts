import { type Response, type NextFunction, type RequestHandler } from 'express';
import { MessagesService } from './messages.service';
import { MessageStatusModel } from './message-status.model';
import { SendMessageSchema, GetMessageHistorySchema, UpdateMessageStatusSchema, MarkAsReadSchema } from './messages.schema';
import { BadRequestError, ForbiddenError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { type AuthRequest } from '../../shared/middleware/auth.middleware';
import { getIO } from '../../socket/gateway';
import { MessageType } from './message.model';
import { ConversationsService } from '../conversations/conversations.service';
import { reportAndReviewMessage } from '../ai/moderation/moderation.service';
import { ConversationMemberModel } from '../conversations/conversation-member.model';
import { refreshPenaltyWindow } from '../ai/moderation/penalty-policy';

// â”€â”€â”€ POST /api/messages/send â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const sendMessageHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // Validate request body
    const validationResult = SendMessageSchema.safeParse(req.body);
    if (!validationResult.success) {
      return next(new BadRequestError(`Validation error: ${validationResult.error.message}`));
    }

    const { conversationId, content, type, mediaUrl, idempotencyKey } = validationResult.data;
    const userId = req.userId;

    const membership = await ConversationMemberModel.findOne({
      conversationId,
      userId,
    }).select('penaltyScore mutedUntil penaltyWindowStartedAt');

    if (!membership) {
      return next(new ForbiddenError('Not allowed to send message in this conversation'));
    }

    if (refreshPenaltyWindow(membership)) {
      await membership.save();
    }

    if (membership.mutedUntil && membership.mutedUntil > new Date()) {
      return next(
        new ForbiddenError(
          `Bạn đang bị tạm khóa gửi tin đến ${membership.mutedUntil.toLocaleTimeString('vi-VN')}`,
        ),
      );
    }

    // Create message
    const message = await MessagesService.createMessage(
      conversationId,
      userId,
      content ?? '',
      type as MessageType,
      idempotencyKey,
      mediaUrl ?? undefined,
    );

    res.status(201).json({
      success: true,
      messageId: message._id,
      status: 'sent',
      createdAt: message.createdAt,
      message,
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;

// â”€â”€â”€ GET /api/messages/:conversationId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const getMessageHistoryHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const validationResult = GetMessageHistorySchema.safeParse(req.query);

    if (!validationResult.success) {
      return next(new BadRequestError(`Validation error: ${validationResult.error.message}`));
    }

    if (!conversationId || !/^[0-9a-fA-F]{24}$/.test(conversationId)) {
      return next(new BadRequestError('Invalid conversation ID format'));
    }

    const { cursor, limit } = validationResult.data;
    const userId = req.userId;

    // Fetch message history with status for current user
    const result = await MessagesService.getMessageHistory(conversationId, userId, cursor, limit);

    // Clear unread badge for this conversation as soon as the user opens message history.
    try {
      await ConversationsService.clearUnreadCount(conversationId, userId);
    } catch (err) {
      logger.error('[UnreadCount] Failed to clear unread count on history fetch:', err);
    }

    // â”€â”€â”€ AUTO-MARK UNDELIVERED MESSAGES (ASYNC, NO AWAIT) â”€â”€â”€
    // When user fetches old messages (before they were online), auto-mark them as delivered
    // Fire-and-forget: Don't block the response while updating DB
    try {
      const undeliveredIds = await MessagesService.findUndeliveredForUser(conversationId, userId);

      if (undeliveredIds.length > 0) {
        // Use bulkWrite with upsert for safe update-or-insert
        const bulkOps = undeliveredIds.map((u) => ({
          updateOne: {
            filter: { messageId: u.id, userId },
            update: {
              $set: { 
                status: 'read' as const, 
                idempotencyKey: u.idempotencyKey,
              },
            },
            upsert: true,
          },
        }));

        MessageStatusModel.bulkWrite(bulkOps as any)
          .then(() => {
            // Broadcast status update AFTER DB update completes (to ensure persistence)
            const io = getIO();
            if (io) {
              io.to(`conv:${conversationId}`).emit('status_update', {
                messageIds: undeliveredIds.map((u) => u.id),
                idempotencyKeys: undeliveredIds.map((u) => u.idempotencyKey),
                status: 'read',
                userId,
                updatedAt: new Date(),
              });
              logger.info(
                `[Auto-mark] Marked ${undeliveredIds.length} messages as read for user ${userId} in conversation ${conversationId}`,
              );
            }
          })
          .catch((err: unknown) => {
            logger.error('[Auto-mark] Failed to bulkWrite message status:', err);
          });
      }
    } catch (err) {
      // Don't fail the request if auto-mark fails
      logger.error('[Auto-mark] Error fetching undelivered messages:', err);
    }

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;

// â”€â”€â”€ PUT /api/messages/:messageId/status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const updateMessageStatusHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const validationResult = UpdateMessageStatusSchema.safeParse(req.body);

    if (!validationResult.success) {
      return next(new BadRequestError(`Validation error: ${validationResult.error.message}`));
    }

    if (!messageId || messageId.trim().length === 0) {
      return next(new BadRequestError('messageId is required'));
    }

    const { status } = validationResult.data;
    const userId = req.userId;

    // Update status
    const messageStatus = await MessagesService.updateMessageStatus(
      messageId,
      userId,
      status,
    );

    if (!messageStatus) {
      return next(new BadRequestError('Failed to update message status'));
    }

    res.json({
      success: true,
      messageId,
      status: messageStatus.status,
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;

// â”€â”€â”€ POST /api/messages/:messageId/read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const markAsReadHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { messageId } = req.params;

    if (!messageId || messageId.trim().length === 0) {
      return next(new BadRequestError('messageId is required'));
    }

    const userId = req.userId;

    // Mark as read
    const messageStatus = await MessagesService.markAsRead(messageId, userId);

    if (!messageStatus) {
      return next(new BadRequestError('Message not found'));
    }

    res.json({
      success: true,
      messageId,
      status: 'read',
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;

// â”€â”€â”€ POST /api/messages/batch/read â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const markMultipleAsReadHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const validationResult = MarkAsReadSchema.safeParse(req.body);

    if (!validationResult.success) {
      return next(new BadRequestError(`Validation error: ${validationResult.error.message}`));
    }

    const { messageIds } = validationResult.data;
    const userId = req.userId;

    // Batch mark as read
    await MessagesService.markMultipleAsRead(messageIds, userId);

    res.json({
      success: true,
      count: messageIds.length,
      status: 'read',
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;

// â”€â”€â”€ POST /api/messages/:messageId/report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const reportMessageHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { messageId } = req.params;

    if (!messageId || messageId.trim().length === 0) {
      return next(new BadRequestError('messageId is required'));
    }

    const userId = req.userId!;

    // Call Moderation Service to evaluate with Gemini
    const action = await reportAndReviewMessage(messageId, userId);

    res.json({
      success: true,
      messageId,
      reportedBy: userId,
      result: action, // pass or block
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;

// â”€â”€â”€ POST /api/messages/:messageId/react â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const reactMessageHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { messageId } = req.params;
    const { reactionType } = req.body;

    if (!messageId || messageId.trim().length === 0) {
      return next(new BadRequestError('messageId is required'));
    }
    if (!reactionType) {
      return next(new BadRequestError('reactionType is required'));
    }

    const userId = req.userId!;
    const message = await MessagesService.findMessageByReference(messageId);
    if (!message) {
      return next(new BadRequestError('Message not found'));
    }

    const existingIndex = message.reactions?.findIndex((r: any) => r.userId === userId && r.type === reactionType) ?? -1;
    let actionType = 'added';
    
    if (existingIndex > -1) {
      message.reactions?.splice(existingIndex, 1);
      actionType = 'removed';
    } else {
      if (!message.reactions) message.reactions = [];
      message.reactions.push({ type: reactionType, userId });
    }

    await message.save();

    const io = getIO();
    if (io) {
      io.to(`conv:${message.conversationId}`).emit('message_reacted', {
        messageId,
        conversationId: message.conversationId,
        reactionType,
        userId,
        actionType,
        reactions: message.reactions,
      });
    }

    res.json({
      success: true,
      messageId,
      action: actionType,
      reactions: message.reactions,
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;
