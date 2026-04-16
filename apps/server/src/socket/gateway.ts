import { type Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { createRedisDuplicate, getRedis, setTypingIndicator, removeTypingIndicator, setUserOnline, removeUserOnline, checkMessageRateLimit } from '../infrastructure/redis';
import { logger } from '../shared/logger';
import type { StoryReactionType } from '../modules/stories/story.model';
import { MessagesService } from '../modules/messages/messages.service';
import { MessageModel } from '../modules/messages/message.model';
import { MessageStatusModel } from '../modules/messages/message-status.model';
import { produceMessage, KAFKA_TOPICS } from '../infrastructure/kafka';
import { ConversationMemberModel } from '../modules/conversations/conversation-member.model';
import { UserModel } from '../modules/users/user.model';
import { setKafkaInsertFailureCallback } from '../workers/message.worker';
import { produceNotificationEvent } from '../modules/notifications/notifications.service';
import { MessageType } from '../modules/messages/message.model';
import { MessageReactionsService } from '../modules/messages/message-reaction.service';
import { REACTION_CONTRACT_VERSION } from '../modules/messages/message-reaction.types';
import { BadRequestError } from '../shared/errors';
import { runKeywordFilter } from '../modules/ai/moderation/keyword-filter';
import {
  PENALTY_BLOCK_PERCENT,
  PENALTY_WARNING_PERCENT,
  applyPenaltyScore,
  refreshPenaltyWindow,
} from '../modules/ai/moderation/penalty-policy';


// Rate limits: normal (300/500ms) vs fallback (200/500ms)

let ioInstance: Server | null = null;
let kafkaFailureMode = false; // Track if Kafka batch insert is failing

interface AuthSocket extends Socket {
  userId: string;
}

interface ReactionUpsertPayload {
  requestId: string;
  conversationId: string;
  messageRef: string;
  emoji: string;
  delta: number;
  actionSource: 'picker-select' | 'trigger-click';
  idempotencyKey: string;
}

interface ReactionRemoveAllMinePayload {
  requestId: string;
  conversationId: string;
  messageRef: string;
  idempotencyKey: string;
}

export function getIO(): Server | null {
  return ioInstance;
}

export function setKafkaFailureMode(failed: boolean): void {
  if (failed !== kafkaFailureMode) {
    kafkaFailureMode = failed;
    logger.warn(`[Gateway] Kafka failure mode: ${failed ? 'ENABLED' : 'DISABLED'}`);
  }
}

export function emitStoryReaction(
  targetUserId: string,
  payload: { storyId: string; userId: string; reactionType: StoryReactionType; displayName: string },
): void {
  ioInstance?.to(`user:${targetUserId}`).emit('story_reaction', payload);
}

export function emitStoryReply(
  targetUserId: string,
  payload: { storyId: string; senderId: string; content: string; displayName: string },
): void {
  ioInstance?.to(`user:${targetUserId}`).emit('story_reply', payload);
}

export function emitNotification(
  userId: string,
  notification: Record<string, unknown>,
): void {
  ioInstance?.to(`user:${userId}`).emit('new_notification', notification);
}

export function initSocketGateway(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3001').split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  MessageReactionsService.setReactionUpdatedBroadcaster((conversationId, payload) => {
    io.to(`conv:${conversationId}`).emit('reaction_updated', payload);
  });

  // Setup fallback callback for Kafka worker failures
  setKafkaInsertFailureCallback(async (failedMessages) => {
    try {
      // Enable fallback mode: reduce rate limit to 200/500ms
      setKafkaFailureMode(true);
      await MessagesService.fallbackBatchInsert(failedMessages);
      logger.info(`[Fallback] Successfully inserted ${failedMessages.length} messages via service`);
    } catch (err) {
      logger.error('[Fallback] Failed to insert messages', err);
    }
  });

  // Dùng Redis adapter để đồng bộ sự kiện giữa nhiều server instance
  const pubClient = getRedis();
  const subClient = createRedisDuplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Xác thực JWT trước khi cho phép kết nối socket
  io.use((socket, next) => {
    const token = (socket.handshake.auth as Record<string, string>)['token']
      ?? socket.handshake.headers['authorization']?.replace('Bearer ', '');

    if (!token) return next(new Error('Missing auth token'));

    try {
      const secret = process.env['JWT_SECRET'];
      if (!secret) throw new Error('JWT_SECRET not configured');
      const payload = jwt.verify(token, secret) as { sub: string };
      (socket as AuthSocket).userId = payload.sub;
      next();
    } catch {
      next(new Error('Invalid auth token'));
    }
  });

  // Xử lý kết nối socket mới
  io.on('connection', (socket) => {
    const { userId } = socket as AuthSocket;
    logger.debug(`Socket connected: ${userId}`);

    // Tham gia room cá nhân để nhận tin nhắn trực tiếp
    void socket.join(`user:${userId}`);

    // Đánh dấu user đang online trong Redis
    void setUserOnline(userId);

    socket.on('join_conversation', async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) {
        return;
      }

      try {
        const member = await ConversationMemberModel.findOne({
          conversationId,
          userId,
        }).select('penaltyScore mutedUntil penaltyWindowStartedAt');

        if (!member) {
          socket.emit('error', { message: 'Not allowed to join this conversation' });
          return;
        }

        if (refreshPenaltyWindow(member)) {
          await member.save();
        }

        await socket.join(`conv:${conversationId}`);

        socket.emit('user_penalty_updated', {
          conversationId,
          penaltyScore: member.penaltyScore ?? 0,
          mutedUntil: member.mutedUntil ?? null,
        });
      } catch (err) {
        logger.error('join_conversation error', err);
      }
    });

    socket.on('leave_conversation', async (payload: { conversationId?: string }) => {
      const conversationId = payload?.conversationId;
      if (!conversationId) {
        return;
      }

      try {
        await socket.leave(`conv:${conversationId}`);
      } catch (err) {
        logger.error('leave_conversation error', err);
      }
    });

    // Sự kiện gửi tin nhắn
    socket.on('send_message', async (payload: unknown) => {
      try {
        await handleSendMessage(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('send_message error', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Sự kiện bắt đầu gõ phím
    socket.on('typing_start', async (payload: unknown) => {
      try {
        if (typeof payload !== 'object' || payload === null) {
          socket.emit('error', { message: 'Invalid typing_start payload' });
          return;
        }

        const { conversationId } = payload as { conversationId?: string };
        if (!conversationId) {
          socket.emit('error', { message: 'Missing conversationId' });
          return;
        }

        const membership = await ConversationMemberModel.exists({ conversationId, userId });
        if (!membership) {
          socket.emit('error', { message: 'Not allowed to type in this conversation' });
          return;
        }

        await socket.join(`conv:${conversationId}`);
        await setTypingIndicator(conversationId, userId);
        socket.to(`conv:${conversationId}`).emit('typing_indicator', {
          userId,
          conversationId,
          isTyping: true,
        });
      } catch (err) {
        logger.error('typing_start error', err);
        socket.emit('error', { message: 'Failed to update typing status' });
      }
    });

    // Sự kiện dừng gõ phím
    socket.on('typing_stop', async (payload: unknown) => {
      try {
        if (typeof payload !== 'object' || payload === null) {
          socket.emit('error', { message: 'Invalid typing_stop payload' });
          return;
        }

        const { conversationId } = payload as { conversationId?: string };
        if (!conversationId) {
          socket.emit('error', { message: 'Missing conversationId' });
          return;
        }

        const membership = await ConversationMemberModel.exists({ conversationId, userId });
        if (!membership) {
          socket.emit('error', { message: 'Not allowed to type in this conversation' });
          return;
        }

        await socket.join(`conv:${conversationId}`);
        await removeTypingIndicator(conversationId, userId);
        socket.to(`conv:${conversationId}`).emit('typing_indicator', {
          userId,
          conversationId,
          isTyping: false,
        });
      } catch (err) {
        logger.error('typing_stop error', err);
        socket.emit('error', { message: 'Failed to update typing status' });
      }
    });

    // Sự kiện đánh dấu đã đọc tin nhắn
    socket.on('message_read', async (payload: unknown) => {
      try {
        await handleMessageRead(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('message_read error', err);
        socket.emit('error', { message: 'Failed to update message status' });
      }
    });

    // Sự kiện đánh dấu tin nhắn đã được gửi tới (delivered)
    socket.on('message_delivered', async (payload: unknown) => {
      try {
        await handleMessageDelivered(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('message_delivered error', err);
        socket.emit('error', { message: 'Failed to mark message as delivered' });
      }
    });

    socket.on('reaction_upsert', async (payload: unknown) => {
      try {
        await handleReactionUpsert(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('reaction_upsert error', err);
        const reactionError = resolveReactionError(err, 'REACTION_UPSERT_FAILED', 'Failed to upsert reaction');
        emitReactionError(
          socket,
          extractReactionContext(payload),
          reactionError.code,
          reactionError.message,
        );
      }
    });

    socket.on('reaction_remove_all_mine', async (payload: unknown) => {
      try {
        await handleReactionRemoveAllMine(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('reaction_remove_all_mine error', err);
        const reactionError = resolveReactionError(err, 'REACTION_REMOVE_FAILED', 'Failed to remove reactions');
        emitReactionError(
          socket,
          extractReactionContext(payload),
          reactionError.code,
          reactionError.message,
        );
      }
    });

    // ─── Delete & Recall Events ───

    // Delete message for sender only
    socket.on('delete_message_for_me', async (payload: unknown) => {
      try {
        await handleDeleteMessageForMe(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('delete_message_for_me error', err);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Recall message (delete everywhere)
    socket.on('recall_message', async (payload: unknown) => {
      try {
        await handleRecallMessage(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('recall_message error', err);
        socket.emit('error', { message: 'Failed to recall message' });
      }
    });

    // Forward message to another conversation
    socket.on('forward_message', async (payload: unknown) => {
      try {
        await handleForwardMessage(io, socket as AuthSocket, payload);
      } catch (err) {
        logger.error('forward_message error', err);
        socket.emit('error', { message: 'Failed to forward message' });
      }
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${userId}`);
      void removeUserOnline(userId);
      io.emit('user_online', { userId, online: false, lastSeen: new Date().toISOString() });
    });

    // Thông báo bạn bè user vừa online
    io.emit('user_online', { userId, online: true });
  });

  return io;
}

async function handleSendMessage(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const { userId } = socket;

  // ─── Rate Limit Check ───
  const isWithinLimit = await checkMessageRateLimit(userId, kafkaFailureMode);
  if (!isWithinLimit) {
    const limitMsg = kafkaFailureMode
      ? 'Rate limit exceeded: max 200 messages/500ms (fallback mode)'
      : 'Rate limit exceeded: max 300 messages/500ms';
    socket.emit('error', { message: limitMsg });
    return;
  }

  // ─── Validate Payload ───
  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const msg = payload as Record<string, unknown>;
  let { conversationId, content, type, mediaUrl, idempotencyKey } = msg;

  if (!conversationId || !idempotencyKey) {
    socket.emit('error', { message: 'Missing required fields: conversationId, idempotencyKey' });
    return;
  }

  // Allow empty content if mediaUrl is provided, otherwise content is required
  if (!content && !mediaUrl) {
    socket.emit('error', { message: 'Either content or mediaUrl must be provided' });
    return;
  }

  // Validate content if provided
  if (content && (typeof content !== 'string' || content.length > 1000)) {
    socket.emit('error', { message: 'Content must be 1-1000 characters' });
    return;
  }

  const isValidMessageType = (type: string): boolean => {
    return ['text', 'image', 'video', 'audio', 'sticker'].includes(type) || type.startsWith('file/');
  };
  const normalizedType = typeof type === 'string' ? type : 'text';
  if (!isValidMessageType(normalizedType)) {
    socket.emit('error', { message: 'Invalid message type' });
    return;
  }

  const membership = await ConversationMemberModel.findOne({
    conversationId: conversationId as string,
    userId,
  }).select('penaltyScore mutedUntil penaltyWindowStartedAt');

  if (!membership) {
    socket.emit('error', { message: 'Not allowed to send message in this conversation' });
    return;
  }

  if (refreshPenaltyWindow(membership)) {
    await membership.save();
  }

  if (membership.mutedUntil && membership.mutedUntil > new Date()) {
    socket.emit('error', {
      message: `Bạn đang bị tạm khóa gửi tin đến ${membership.mutedUntil.toLocaleTimeString('vi-VN')}`,
    });
    socket.emit('user_penalty_updated', {
      conversationId: conversationId as string,
      penaltyScore: membership.penaltyScore ?? 0,
      mutedUntil: membership.mutedUntil,
    });
    return;
  }

  // Ensure sender has joined this conversation room for self-receive status events.
  await socket.join(`conv:${conversationId as string}`);

  let moderationWarning = false;

  // ─── Fast moderation gate (sync) ───
  // Blocks obvious text violations before publishing to Kafka/socket recipients.
  // Deeper moderation remains async in moderation.worker.
  if (normalizedType === 'text' && typeof content === 'string' && content.trim().length > 0) {
    const quickModeration = runKeywordFilter(content);
    if (quickModeration.label === 'blocked') {
      await applyRealtimeKeywordPenalty(
        conversationId as string,
        userId,
        PENALTY_BLOCK_PERCENT,
      );

      socket.emit('content_warning', {
        conversationId: conversationId as string,
        message: `Tin nhan vi pham keyword va da duoc tinh +${PENALTY_BLOCK_PERCENT}% vi pham.`,
      });

      socket.emit('content_blocked', {
        messageId: idempotencyKey as string,
        conversationId: conversationId as string,
        reason: 'Tin nhan cua ban vi pham tieu chuan cong dong va da bi chan.',
        confidence: quickModeration.confidence,
      });

      io.to(`conv:${conversationId as string}`).emit('message_recalled', {
        messageId: idempotencyKey as string,
        idempotencyKey: idempotencyKey as string,
        conversationId: conversationId as string,
        recalledBy: 'system',
        recalledAt: new Date().toISOString(),
      });

      await produceModerationNotification(
        userId,
        conversationId as string,
        `Tin nhan cua ban da bi thu hoi do vi pham tieu chuan cong dong (+${PENALTY_BLOCK_PERCENT}%).`,
      );

      logger.warn('[Gateway] Blocked message before publish (keyword pre-check)', {
        conversationId,
        senderId: userId,
        idempotencyKey,
        label: quickModeration.label,
        confidence: quickModeration.confidence,
        reason: quickModeration.reason,
      });
      return;
    }

    if (quickModeration.label === 'warning') {
      moderationWarning = true;

      await applyRealtimeKeywordPenalty(
        conversationId as string,
        userId,
        PENALTY_WARNING_PERCENT,
      );

      socket.emit('content_warning', {
        conversationId: conversationId as string,
        messageId: idempotencyKey as string,
        message: `Tin nhan cua ban co noi dung nhay cam. He thong da cong +${PENALTY_WARNING_PERCENT}% vi pham.`,
      });

      logger.warn('[Gateway] Warning keyword detected before publish', {
        conversationId,
        senderId: userId,
        idempotencyKey,
        label: quickModeration.label,
        confidence: quickModeration.confidence,
        reason: quickModeration.reason,
      });
    }
  }

  // ─── Create Message via Service ───
  try {
    const message = await MessagesService.createMessage(
      conversationId as string,
      userId,
      typeof content === 'string' ? content : '',
      normalizedType as MessageType,
      (idempotencyKey as string),
      mediaUrl ? (mediaUrl as string) : undefined,
      moderationWarning,
    );

    // Note: createMessage already publishes to Kafka (worker will insert)
    // Message object here is a mock with temporary ID until Kafka worker inserts real DB

    // ─── Emit to Recipients (NOT to sender - they already have optimistic update) ───
    socket.to(`conv:${conversationId}`).emit('receive_message', {
      messageId: message._id,
      conversationId,
      senderId: userId,
      content: typeof content === 'string' ? content : '',
      type: normalizedType,
      mediaUrl,
      moderationWarning,
      idempotencyKey,
      createdAt: message.createdAt,
    });

    // ─── Emit Status Update to ALL (including sender) ───
    io.to(`conv:${conversationId}`).emit('status_update', {
      messageId: message._id,
      status: 'sent',
      userId,
    });

    // ─── Confirm to Sender (replace optimistic message ID) ───
    socket.emit('message_sent', {
      messageId: message._id,
      idempotencyKey,
      createdAt: message.createdAt,
    });

    logger.debug(`Message created: ${message._id} in conversation ${conversationId}`);

    // F1: Produce notification for offline conversation members
    void (async () => {
      try {
        const members = await ConversationMemberModel.find({
          conversationId: conversationId as string,
        }).lean();

        const sender = await UserModel.findById(userId).select('displayName').lean();
        const senderName = (sender?.displayName as string) ?? 'Someone';
        const preview = typeof content === 'string'
          ? content.slice(0, 100)
          : (normalizedType === 'text' ? '' : `[${normalizedType}]`);

        for (const member of members) {
          if (member.userId === userId) continue;

          await produceNotificationEvent({
            userId: member.userId,
            type: 'new_message',
            title: `Tin nhắn mới từ ${senderName}`,
            body: preview,
            conversationId: conversationId as string,
            fromUserId: userId,
            data: { conversationId: conversationId as string, action: 'open_chat' },
          });
        }
      } catch (notifErr) {
        logger.error('Failed to produce message notifications', notifErr);
      }
    })();
  } catch (err) {
    logger.error('Failed to create message', err);
    throw err;
  }
}

async function produceModerationNotification(
  userId: string,
  conversationId: string,
  body: string,
): Promise<void> {
  await produceNotificationEvent({
    userId,
    type: 'new_message',
    title: 'Thong bao kiem duyet',
    body,
    conversationId,
    fromUserId: userId,
    data: {
      conversationId,
      action: 'moderation_notice',
    },
  });
}

async function applyRealtimeKeywordPenalty(
  conversationId: string,
  userId: string,
  amount: number,
): Promise<void> {
  try {
    const member = await ConversationMemberModel.findOne({ conversationId, userId });
    if (!member) {
      return;
    }

    const { mutedUntil, becameMuted } = applyPenaltyScore(member, amount);

    if (becameMuted) {
      await UserModel.findByIdAndUpdate(userId, { $inc: { globalViolationCount: 1 } });
    }

    await member.save();

    const io = getIO();
    if (io) {
      io.to(`user:${userId}`).emit('user_penalty_updated', {
        conversationId,
        penaltyScore: member.penaltyScore,
        mutedUntil: member.mutedUntil ?? null,
      });
    }

    if (becameMuted && mutedUntil) {
      await produceModerationNotification(
        userId,
        conversationId,
        `Ban da dat 100% vi pham va bi khoa chat 5 phut den ${mutedUntil.toLocaleTimeString('vi-VN')}.`,
      );

      logger.warn('[Gateway] User muted after keyword overflow', {
        conversationId,
        userId,
        mutedUntil: mutedUntil.toISOString(),
      });
    }
  } catch (err) {
    logger.error('[Gateway] Failed to apply realtime keyword penalty', err);
  }
}

async function handleMessageRead(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const { userId } = socket;

  // ─── Validate Payload ───
  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const data = payload as Record<string, unknown>;
  const { conversationId, messageIds } = data;

  if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
    socket.emit('error', { message: 'Missing required fields: conversationId, messageIds (array)' });
    return;
  }

  if (messageIds.length === 0) {
    socket.emit('error', { message: 'messageIds cannot be empty' });
    return;
  }

  const membership = await ConversationMemberModel.exists({
    conversationId: conversationId as string,
    userId,
  });

  if (!membership) {
    socket.emit('error', { message: 'Not allowed to update read status in this conversation' });
    return;
  }

  await socket.join(`conv:${conversationId as string}`);

  // ─── Batch Update Message Status ───
  try {
    for (const messageId of messageIds) {
      await MessagesService.markAsRead(messageId as string, userId);
    }

    // ─── Simply emit read status back to sender ───
    // Note: We don't query MongoDB for aggregation here because it's async
    // and may not reflect the just-updated status. Frontend will fetch latest via API.
    io.to(`conv:${conversationId}`).emit('status_update', {
      messageIds,
      status: 'read',
      userId,
      updatedAt: new Date(),
    });

    logger.debug(`Marked ${messageIds.length} messages as read by ${userId}`);
  } catch (err) {
    logger.error('Failed to mark messages as read', err);
    throw err;
  }
}

async function handleMessageDelivered(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const { userId } = socket;

  // ─── Validate Payload ───
  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const data = payload as Record<string, unknown>;
  const { conversationId, messageIds } = data;

  if (!conversationId || !messageIds || !Array.isArray(messageIds)) {
    socket.emit('error', { message: 'Missing required fields: conversationId, messageIds (array)' });
    return;
  }

  if (messageIds.length === 0) {
    socket.emit('error', { message: 'messageIds cannot be empty' });
    return;
  }

  const membership = await ConversationMemberModel.exists({
    conversationId: conversationId as string,
    userId,
  });

  if (!membership) {
    socket.emit('error', { message: 'Not allowed to update delivery status in this conversation' });
    return;
  }

  await socket.join(`conv:${conversationId as string}`);

  // ─── Batch Update Message Status to 'delivered' ───
  try {
    for (const messageId of messageIds) {
      await MessagesService.updateMessageStatus(messageId as string, userId, 'delivered');
    }

    // ─── Simply emit delivered status to conversation group ───
    // Note: We don't query MongoDB for aggregation here because it's async
    // and may not reflect the just-updated status. Frontend will fetch latest via API.
    io.to(`conv:${conversationId}`).emit('status_update', {
      messageIds,
      status: 'delivered',
      userId,
      updatedAt: new Date(),
    });

    logger.debug(`Marked ${messageIds.length} messages as delivered by ${userId}`);
  } catch (err) {
    logger.error('Failed to mark messages as delivered', err);
    throw err;
  }
}

async function handleDeleteMessageForMe(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const userId = socket.userId;

  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const { messageId, idempotencyKey, conversationId } = payload as {
    messageId?: string;
    idempotencyKey?: string;
    conversationId?: string;
  };

  if (!messageId || !idempotencyKey || !conversationId) {
    socket.emit('error', { message: 'Missing messageId or conversationId' });
    return;
  }

  // ✅ USE .then() INSTEAD OF await
  MessagesService.deleteMessageForMe(idempotencyKey, userId)
    .then((message) => {
      // Notify only this user (only they see the change)
      socket.emit('message_deleted_for_me', {
        messageId: messageId,
        conversationId,
        deletedAt: new Date().toISOString(),
      });

      logger.debug(`Message ${messageId} deleted for me by user ${userId}`);
    })
    .catch((err) => {
      logger.error('handleDeleteMessageForMe error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}

async function handleRecallMessage(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const userId = socket.userId;

  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const { messageId, idempotencyKey, conversationId } = payload as {
    messageId?: string;
    idempotencyKey?: string;
    conversationId?: string;
  };

  if (!messageId || !idempotencyKey || !conversationId) {
    socket.emit('error', { message: 'Missing messageId or conversationId' });
    return;
  }

  // ✅ USE .then() INSTEAD OF await
  MessagesService.recallMessage(idempotencyKey, userId)
    .then((message) => {
      // Broadcast to EVERYONE in conversation (sender + all recipients)
      io.to(`conv:${conversationId}`).emit('message_recalled', {
        messageId: messageId,
        idempotencyKey: idempotencyKey,
        conversationId,
        recalledBy: userId,
        recalledAt: new Date().toISOString(),
      });

      logger.info(`Message ${messageId} recalled by user ${userId}`);
    })
    .catch((err) => {
      logger.error('handleRecallMessage error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}

async function handleForwardMessage(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const userId = socket.userId;

  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const { originalMessageId, toConversationId, idempotencyKey } = payload as {
    originalMessageId?: string;
    toConversationId?: string;
    idempotencyKey?: string;
  };

  if (!originalMessageId || !toConversationId || !idempotencyKey) {
    socket.emit('error', { message: 'Missing required fields' });
    return;
  }

  // ✅ USE .then() INSTEAD OF await
  MessagesService.forwardMessage(originalMessageId, toConversationId, userId, idempotencyKey)
    .then((newMessage) => {
      // Broadcast to target conversation
      io.to(`conv:${toConversationId}`).emit('receive_message', {
        messageId: newMessage._id,
        conversationId: toConversationId,
        senderId: userId,
        content: newMessage.content,
        type: newMessage.type,
        mediaUrl: newMessage.mediaUrl,
        status: 'sent',
        createdAt: newMessage.createdAt,
        idempotencyKey: newMessage.idempotencyKey,
      });

      // Confirm to sender
      socket.emit('message_forwarded', {
        messageId: newMessage._id,
        idempotencyKey,
        toConversationId,
      });

      logger.info(`Message ${originalMessageId} forwarded to ${toConversationId} by user ${userId}`);
    })
    .catch((err) => {
      logger.error('handleForwardMessage error', err);
      socket.emit('error', { message: (err as Error).message });
    });
}

async function handleReactionUpsert(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const { userId } = socket;
  const input = parseReactionUpsertPayload(payload);

  const membership = await ConversationMemberModel.exists({
    conversationId: input.conversationId,
    userId,
  });

  if (!membership) {
    emitReactionError(socket, input, 'FORBIDDEN', 'Not allowed to react in this conversation');
    return;
  }

  const withinRateLimit = await MessageReactionsService.checkReactionRateLimit(userId, input.messageRef);
  if (!withinRateLimit) {
    emitReactionError(socket, input, 'RATE_LIMITED', 'Too many reaction updates. Please try again shortly.');
    return;
  }

  await socket.join(`conv:${input.conversationId}`);

  const resolvedMessage = await MessageReactionsService.resolveMessageByRef(input.messageRef);
  if (resolvedMessage && resolvedMessage.conversationId !== input.conversationId) {
    emitReactionError(socket, input, 'MESSAGE_NOT_FOUND', 'Message does not belong to this conversation');
    return;
  }

  socket.emit('reaction_ack', buildReactionAckPayload({
    requestId: input.requestId,
    conversationId: input.conversationId,
    messageRef: input.messageRef,
    messageId: resolvedMessage?._id?.toString() ?? null,
    userId,
    action: 'upsert',
  }));

  void (async () => {
    try {
      const cached = await MessageReactionsService.getCachedReactionUpdate(input.idempotencyKey);
      if (cached) {
        io.to(`conv:${input.conversationId}`).emit('reaction_updated', cached);
        return;
      }

      const targetMessage = resolvedMessage ?? await MessageReactionsService.resolveMessageByRef(input.messageRef);
      if (!targetMessage) {
        await MessageReactionsService.enqueuePendingReaction({
          requestId: input.requestId,
          userId,
          conversationId: input.conversationId,
          messageRef: input.messageRef,
          action: 'upsert',
          actionSource: input.actionSource,
          emoji: input.emoji,
          delta: input.delta,
          idempotencyKey: input.idempotencyKey,
          createdAt: new Date().toISOString(),
        });
        return;
      }

      if (targetMessage.conversationId !== input.conversationId) {
        emitReactionError(socket, input, 'MESSAGE_NOT_FOUND', 'Message does not belong to this conversation');
        return;
      }

      const result = await MessageReactionsService.applyUpsertReaction({
        messageId: targetMessage._id.toString(),
        conversationId: input.conversationId,
        userId,
        emoji: input.emoji,
        delta: input.delta,
      });

      const updatedPayload = MessageReactionsService.buildReactionUpdatedPayload({
        requestId: input.requestId,
        conversationId: input.conversationId,
        messageRef: input.messageRef,
        messageId: targetMessage._id.toString(),
        actor: {
          userId,
          action: 'upsert',
          actionSource: input.actionSource,
          emoji: input.emoji,
          delta: input.delta,
        },
        summary: result.summary,
        userState: result.userState,
        updatedAt: result.updatedAt,
      });

      await MessageReactionsService.cacheReactionUpdate(input.idempotencyKey, updatedPayload);
      io.to(`conv:${input.conversationId}`).emit('reaction_updated', updatedPayload);
    } catch (error) {
      logger.error('reaction_upsert async flow error', error);
      emitReactionError(socket, input, 'REACTION_UPSERT_FAILED', 'Failed to update reaction');
    }
  })();
}

async function handleReactionRemoveAllMine(
  io: Server,
  socket: AuthSocket,
  payload: unknown,
): Promise<void> {
  const { userId } = socket;
  const input = parseReactionRemoveAllMinePayload(payload);

  const membership = await ConversationMemberModel.exists({
    conversationId: input.conversationId,
    userId,
  });

  if (!membership) {
    emitReactionError(socket, input, 'FORBIDDEN', 'Not allowed to react in this conversation');
    return;
  }

  const withinRateLimit = await MessageReactionsService.checkReactionRateLimit(userId, input.messageRef);
  if (!withinRateLimit) {
    emitReactionError(socket, input, 'RATE_LIMITED', 'Too many reaction updates. Please try again shortly.');
    return;
  }

  await socket.join(`conv:${input.conversationId}`);

  const resolvedMessage = await MessageReactionsService.resolveMessageByRef(input.messageRef);
  if (resolvedMessage && resolvedMessage.conversationId !== input.conversationId) {
    emitReactionError(socket, input, 'MESSAGE_NOT_FOUND', 'Message does not belong to this conversation');
    return;
  }

  socket.emit('reaction_ack', buildReactionAckPayload({
    requestId: input.requestId,
    conversationId: input.conversationId,
    messageRef: input.messageRef,
    messageId: resolvedMessage?._id?.toString() ?? null,
    userId,
    action: 'remove_all_mine',
  }));

  void (async () => {
    try {
      const cached = await MessageReactionsService.getCachedReactionUpdate(input.idempotencyKey);
      if (cached) {
        io.to(`conv:${input.conversationId}`).emit('reaction_updated', cached);
        return;
      }

      const targetMessage = resolvedMessage ?? await MessageReactionsService.resolveMessageByRef(input.messageRef);
      if (!targetMessage) {
        await MessageReactionsService.enqueuePendingReaction({
          requestId: input.requestId,
          userId,
          conversationId: input.conversationId,
          messageRef: input.messageRef,
          action: 'remove_all_mine',
          actionSource: 'picker-select',
          idempotencyKey: input.idempotencyKey,
          createdAt: new Date().toISOString(),
        });
        return;
      }

      if (targetMessage.conversationId !== input.conversationId) {
        emitReactionError(socket, input, 'MESSAGE_NOT_FOUND', 'Message does not belong to this conversation');
        return;
      }

      const result = await MessageReactionsService.applyRemoveAllMine({
        messageId: targetMessage._id.toString(),
        conversationId: input.conversationId,
        userId,
      });

      const updatedPayload = MessageReactionsService.buildReactionUpdatedPayload({
        requestId: input.requestId,
        conversationId: input.conversationId,
        messageRef: input.messageRef,
        messageId: targetMessage._id.toString(),
        actor: {
          userId,
          action: 'remove_all_mine',
          actionSource: 'picker-select',
        },
        summary: result.summary,
        userState: result.userState,
        updatedAt: result.updatedAt,
      });

      await MessageReactionsService.cacheReactionUpdate(input.idempotencyKey, updatedPayload);
      io.to(`conv:${input.conversationId}`).emit('reaction_updated', updatedPayload);
    } catch (error) {
      logger.error('reaction_remove_all_mine async flow error', error);
      emitReactionError(socket, input, 'REACTION_REMOVE_FAILED', 'Failed to remove reactions');
    }
  })();
}

function parseReactionUpsertPayload(payload: unknown): ReactionUpsertPayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new BadRequestError('Invalid reaction_upsert payload', 'VALIDATION_ERROR');
  }

  const data = payload as Record<string, unknown>;
  const requestId = data['requestId'];
  const conversationId = data['conversationId'];
  const messageRef = data['messageRef'];
  const emoji = data['emoji'];
  const delta = data['delta'];
  const actionSource = data['actionSource'];
  const idempotencyKey = data['idempotencyKey'];

  if (typeof requestId !== 'string' || requestId.length === 0) {
    throw new BadRequestError('requestId is required', 'VALIDATION_ERROR');
  }

  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    throw new BadRequestError('conversationId is required', 'VALIDATION_ERROR');
  }

  if (typeof messageRef !== 'string' || messageRef.length === 0) {
    throw new BadRequestError('messageRef is required', 'VALIDATION_ERROR');
  }

  if (typeof emoji !== 'string' || emoji.length === 0) {
    throw new BadRequestError('emoji is required', 'VALIDATION_ERROR');
  }

  if (typeof delta !== 'number' || !Number.isFinite(delta)) {
    throw new BadRequestError('delta must be a number', 'VALIDATION_ERROR');
  }

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    throw new BadRequestError('idempotencyKey is required', 'VALIDATION_ERROR');
  }

  if (typeof actionSource !== 'string') {
    throw new BadRequestError('actionSource is required', 'VALIDATION_ERROR');
  }

  return {
    requestId,
    conversationId,
    messageRef,
    emoji,
    delta,
    actionSource: MessageReactionsService.ensureReactionActionSource(actionSource),
    idempotencyKey,
  };
}

function parseReactionRemoveAllMinePayload(payload: unknown): ReactionRemoveAllMinePayload {
  if (typeof payload !== 'object' || payload === null) {
    throw new BadRequestError('Invalid reaction_remove_all_mine payload', 'VALIDATION_ERROR');
  }

  const data = payload as Record<string, unknown>;
  const requestId = data['requestId'];
  const conversationId = data['conversationId'];
  const messageRef = data['messageRef'];
  const idempotencyKey = data['idempotencyKey'];

  if (typeof requestId !== 'string' || requestId.length === 0) {
    throw new BadRequestError('requestId is required', 'VALIDATION_ERROR');
  }

  if (typeof conversationId !== 'string' || conversationId.length === 0) {
    throw new BadRequestError('conversationId is required', 'VALIDATION_ERROR');
  }

  if (typeof messageRef !== 'string' || messageRef.length === 0) {
    throw new BadRequestError('messageRef is required', 'VALIDATION_ERROR');
  }

  if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
    throw new BadRequestError('idempotencyKey is required', 'VALIDATION_ERROR');
  }

  return {
    requestId,
    conversationId,
    messageRef,
    idempotencyKey,
  };
}

function buildReactionAckPayload(input: {
  requestId: string;
  conversationId: string;
  messageRef: string;
  messageId: string | null;
  userId: string;
  action: 'upsert' | 'remove_all_mine';
}): Record<string, unknown> {
  return {
    requestId: input.requestId,
    accepted: true,
    conversationId: input.conversationId,
    messageRef: input.messageRef,
    messageId: input.messageId,
    userId: input.userId,
    action: input.action,
    optimistic: true,
    serverTs: new Date().toISOString(),
    contractVersion: REACTION_CONTRACT_VERSION,
  };
}

function emitReactionError(
  socket: Socket,
  context: { requestId?: string; conversationId?: string; messageRef?: string },
  code: string,
  message: string,
): void {
  socket.emit('reaction_error', {
    requestId: context.requestId ?? '',
    conversationId: context.conversationId ?? '',
    messageRef: context.messageRef ?? '',
    code,
    message,
    contractVersion: REACTION_CONTRACT_VERSION,
  });
}

function extractReactionContext(payload: unknown): {
  requestId?: string;
  conversationId?: string;
  messageRef?: string;
} {
  if (typeof payload !== 'object' || payload === null) {
    return {};
  }

  const record = payload as Record<string, unknown>;
  return {
    requestId: typeof record['requestId'] === 'string' ? record['requestId'] : undefined,
    conversationId: typeof record['conversationId'] === 'string' ? record['conversationId'] : undefined,
    messageRef: typeof record['messageRef'] === 'string' ? record['messageRef'] : undefined,
  };
}

function resolveReactionError(
  err: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): { code: string; message: string } {
  if (err instanceof BadRequestError) {
    return {
      code: err.code ?? 'VALIDATION_ERROR',
      message: err.message,
    };
  }

  if (err instanceof Error) {
    return {
      code: fallbackCode,
      message: err.message || fallbackMessage,
    };
  }

  return {
    code: fallbackCode,
    message: fallbackMessage,
  };
}
