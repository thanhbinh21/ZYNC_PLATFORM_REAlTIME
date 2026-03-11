import { type Server as HttpServer } from 'http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { createRedisDuplicate, getRedis } from '../infrastructure/redis';
import { logger } from '../shared/logger';

// Giới hạn 20 tin nhắn/giây/user, kiểm tra qua Redis sliding window
const MSG_RATE_WINDOW_MS = 1000;
const MSG_RATE_LIMIT = 20;

interface AuthSocket extends Socket {
  userId: string;
}

export function initSocketGateway(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (process.env['CORS_ORIGINS'] ?? 'http://localhost:3001').split(','),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
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
    void getRedis().hset('online_users', userId, Date.now().toString());

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
      void getRedis().setex(`typing:${payload.conversationId}:${userId}`, 3, '1');
      socket.to(`conv:${payload.conversationId}`).emit('typing_indicator', {
        userId,
        conversationId: payload.conversationId,
        isTyping: true,
      });
    });

    // Sự kiện dừng gõ phím
    socket.on('typing_stop', (payload: { conversationId: string }) => {
      void getRedis().del(`typing:${payload.conversationId}:${userId}`);
      socket.to(`conv:${payload.conversationId}`).emit('typing_indicator', {
        userId,
        conversationId: payload.conversationId,
        isTyping: false,
      });
    });

    // Sự kiện đánh dấu đã đọc tin nhắn
    socket.on('message_read', (payload: { conversationId: string; messageIds: string[] }) => {
      socket.to(`conv:${payload.conversationId}`).emit('status_update', {
        messageIds: payload.messageIds,
        status: 'read',
        userId,
      });
    });

    // Xử lý ngắt kết nối
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${userId}`);
      void getRedis().hdel('online_users', userId);
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

  // Kiểm tra rate limit bằng Redis sliding window
  const rateLimitKey = `msg_rate:${userId}`;
  const now = Date.now();
  const redisClient = getRedis();

  const pipe = redisClient.pipeline();
  pipe.zremrangebyscore(rateLimitKey, '-inf', now - MSG_RATE_WINDOW_MS);
  pipe.zadd(rateLimitKey, now, `${now}`);
  pipe.zcard(rateLimitKey);
  pipe.expire(rateLimitKey, 2);
  const results = await pipe.exec();
  const count = (results?.[2]?.[1] as number) ?? 0;

  if (count > MSG_RATE_LIMIT) {
    socket.emit('error', { message: 'Rate limit exceeded: max 20 messages/second' });
    return;
  }

  // Kiểm tra cấu trúc payload tối thiểu
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('conversationId' in payload) ||
    !('content' in payload) ||
    !('idempotencyKey' in payload)
  ) {
    socket.emit('error', { message: 'Invalid payload' });
    return;
  }

  const msg = payload as { conversationId: string; content: string; idempotencyKey: string; type?: string; mediaUrl?: string };

  // Kiểm tra idempotency, tránh gửi trùng tin nhắn
  const idempotencyKey = `idempotency:${msg.idempotencyKey}`;
  const existing = await redisClient.get(idempotencyKey);
  if (existing) {
    socket.emit('message_sent', JSON.parse(existing) as unknown);
    return;
  }

  // Tạo envelope tin nhắn
  const messageEnvelope = {
    messageId: msg.idempotencyKey, // dùng idempotencyKey làm ID tạm
    senderId: userId,
    conversationId: msg.conversationId,
    content: msg.content,
    type: msg.type ?? 'text',
    mediaUrl: msg.mediaUrl,
    idempotencyKey: msg.idempotencyKey,
    createdAt: new Date().toISOString(),
  };

  // Lưu idempotency key vào Redis, TTL 5 phút
  await redisClient.setex(idempotencyKey, 300, JSON.stringify(messageEnvelope));

  // Phát tin nhắn đến tất cả thành viên trong conversation
  io.to(`conv:${msg.conversationId}`).emit('receive_message', {
    messageId: messageEnvelope.messageId,
    senderId: userId,
    content: msg.content,
    type: messageEnvelope.type,
    mediaUrl: msg.mediaUrl,
    createdAt: messageEnvelope.createdAt,
  });

  // Xác nhận gửi thành công cho người gửi
  socket.emit('message_sent', { idempotencyKey: msg.idempotencyKey, createdAt: messageEnvelope.createdAt });

  // TODO: publish lên Kafka topic raw-messages để lưu vào MongoDB (Phase 5)
}
