import { type Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { createRedisDuplicate, getRedis, setTypingIndicator, removeTypingIndicator, setUserOnline, removeUserOnline, checkMessageRateLimit } from '../infrastructure/redis';
import { logger } from '../shared/logger';
import type { StoryReactionType } from '../modules/stories/story.model';
import { MessagesService } from '../modules/messages/messages.service';
import { produceMessage, KAFKA_TOPICS } from '../infrastructure/kafka';
import { ConversationMemberModel } from '../modules/conversations/conversation-member.model';


const MSG_RATE_WINDOW_MS = 1000;
const MSG_RATE_LIMIT = 20;

let ioInstance: Server | null = null;

interface AuthSocket extends Socket {
  userId: string;
}

export function getIO(): Server | null {
  return ioInstance;
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

export function initSocketGateway(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3001').split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

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
    socket.on('typing_start', (payload: { conversationId: string }) => {
      void setTypingIndicator(payload.conversationId, userId);
      socket.to(`conv:${payload.conversationId}`).emit('typing_indicator', {
        userId,
        conversationId: payload.conversationId,
        isTyping: true,
      });
    });

    // Sự kiện dừng gõ phím
    socket.on('typing_stop', (payload: { conversationId: string }) => {
      void removeTypingIndicator(payload.conversationId, userId);
      socket.to(`conv:${payload.conversationId}`).emit('typing_indicator', {
        userId,
        conversationId: payload.conversationId,
        isTyping: false,
      });
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
  const isWithinLimit = await checkMessageRateLimit(userId);
  if (!isWithinLimit) {
    socket.emit('error', { message: 'Rate limit exceeded: max 20 messages/second' });
    return;
  }

  // ─── Validate Payload ───
  if (typeof payload !== 'object' || payload === null) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const msg = payload as Record<string, unknown>;
  const { conversationId, content, type, mediaUrl, idempotencyKey } = msg;

  if (!conversationId || !content || !idempotencyKey) {
    socket.emit('error', { message: 'Missing required fields: conversationId, content, idempotencyKey' });
    return;
  }

  if (typeof content !== 'string' || content.length < 1 || content.length > 1000) {
    socket.emit('error', { message: 'Content must be 1-1000 characters' });
    return;
  }

  // Ensure sender has joined this conversation room for self-receive status events.
  await socket.join(`conv:${conversationId as string}`);

  // ─── Create Message via Service ───
  try {
    const message = await MessagesService.createMessage(
      conversationId as string,
      userId,
      content,
      type as ("text" | "image" | "video"),
      (idempotencyKey as string),
      mediaUrl ? (mediaUrl as string) : undefined,
    );

    // ─── Publish to Kafka ───
    try {
      await produceMessage(KAFKA_TOPICS.RAW_MESSAGES, conversationId as string, {
        messageId: message._id.toString(),
        conversationId,
        senderId: userId,
        content,
        type: type ?? 'text',
        mediaUrl,
        idempotencyKey,
        createdAt: message.createdAt,
      });
    } catch (err) {
      logger.warn('Failed to produce Kafka message', err);
      // Continue even if Kafka fails - message still created in DB
    }

    // ─── Emit to Recipients ───
    io.to(`conv:${conversationId}`).emit('receive_message', {
      messageId: message._id,
      conversationId,
      senderId: userId,
      content,
      type: type ?? 'text',
      mediaUrl,
      createdAt: message.createdAt,
    });

    // ─── Emit Status Update ───
    io.to(`conv:${conversationId}`).emit('status_update', {
      messageId: message._id,
      status: 'sent',
      userId,
    });

    // ─── Confirm to Sender ───
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

  await socket.join(`conv:${conversationId as string}`);

  // ─── Batch Update Message Status ───
  try {
    for (const messageId of messageIds) {
      await MessagesService.markAsRead(messageId as string, userId);
    }

    // ─── Broadcast Status Update ───
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

  await socket.join(`conv:${conversationId as string}`);

  // ─── Batch Update Message Status to 'delivered' ───
  try {
    for (const messageId of messageIds) {
      await MessagesService.updateMessageStatus(messageId as string, userId, 'delivered');
    }

    // ─── Broadcast Status Update ───
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
