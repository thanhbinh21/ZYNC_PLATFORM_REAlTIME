import { type Response, type NextFunction, type RequestHandler } from 'express';
import { MessagesService } from './messages.service';
import { SendMessageSchema, GetMessageHistorySchema, UpdateMessageStatusSchema, MarkAsReadSchema } from './messages.schema';
import { BadRequestError } from '../../shared/errors';
import { logger } from '../../shared/logger';
import { type AuthRequest } from '../../shared/middleware/auth.middleware';

// ─── POST /api/messages/send ─────────────────────────────────────────────────

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

    // Create message
    const message = await MessagesService.createMessage(
      conversationId,
      userId,
      content ?? '',
      type,
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

// ─── GET /api/messages/:conversationId ───────────────────────────────────────

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

    res.json({
      success: true,
      ...result,
    });
  } catch (err) {
    next(err);
  }
}) as unknown as RequestHandler;

// ─── PUT /api/messages/:messageId/status ─────────────────────────────────────

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

    if (!messageId || !/^[0-9a-fA-F]{24}$/.test(messageId)) {
      return next(new BadRequestError('Invalid message ID format'));
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

// ─── POST /api/messages/:messageId/read ──────────────────────────────────────

export const markAsReadHandler = (async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { messageId } = req.params;

    if (!messageId || !/^[0-9a-fA-F]{24}$/.test(messageId)) {
      return next(new BadRequestError('Invalid message ID format'));
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

// ─── POST /api/messages/batch/read ──────────────────────────────────────────

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
