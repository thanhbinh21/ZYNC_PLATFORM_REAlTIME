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
import { setKafkaInsertFailureCallback } from '../workers/message.worker';
import { MessageType } from '../modules/messages/message.model';


// Rate limits: normal (300/500ms) vs fallback (200/500ms)

let ioInstance: Server | null = null;
let kafkaFailureMode = false; // Track if Kafka batch insert is failing

interface AuthSocket extends Socket {
  userId: string;
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
        const member = await ConversationMemberModel.exists({
          conversationId,
          userId,
        });

        if (!member) {
          socket.emit('error', { message: 'Not allowed to join this conversation' });
          return;
        }

        await socket.join(`conv:${conversationId}`);
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

  const membership = await ConversationMemberModel.exists({
    conversationId: conversationId as string,
    userId,
  });

  if (!membership) {
    socket.emit('error', { message: 'Not allowed to send message in this conversation' });
    return;
  }

  // Ensure sender has joined this conversation room for self-receive status events.
  await socket.join(`conv:${conversationId as string}`);

  // ─── Create Message via Service ───
  try {
    const message = await MessagesService.createMessage(
      conversationId as string,
      userId,
      typeof content === 'string' ? content : '',
      normalizedType as MessageType,
      (idempotencyKey as string),
      mediaUrl ? (mediaUrl as string) : undefined,
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
  } catch (err) {
    logger.error('Failed to create message', err);
    throw err;
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
