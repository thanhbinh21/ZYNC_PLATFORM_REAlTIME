import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { friendsRouter } from './modules/friends/friends.routes';
import { groupsRouter } from './modules/groups/groups.routes';
import { conversationsRouter } from './modules/conversations/conversations.routes';
import { messagesRouter } from './modules/messages/messages.routes';
import { storiesRouter } from './modules/stories/stories.routes';
import { uploadRouter } from './modules/upload/upload.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { aiRouter } from './modules/ai/ai.routes';
import { moderationAdminRouter } from './modules/ai/moderation/moderation.controller';
import { AppError } from './shared/errors/app-error';
import { logger } from './shared/logger';

export function createApp(): Application {
  const app = express();

  // Middleware bảo mật
  app.use(helmet());
  app.use(cors({
    origin: true,
    credentials: true,
  }));

  // Phân tích request body
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  // Logging HTTP request
  if (process.env['NODE_ENV'] !== 'test') {
    app.use(morgan('combined', {
      stream: { write: (msg: string) => logger.http(msg.trim()) },
    }));
  }

  // Endpoint kiểm tra sức khỏe server
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Đăng ký toàn bộ routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/friends', friendsRouter);
  app.use('/api/groups', groupsRouter);
  app.use('/api/conversations', conversationsRouter);
  app.use('/api/messages', messagesRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/upload', uploadRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/ai', aiRouter);
  app.use('/api/admin/moderation', moderationAdminRouter);

  // Xử lý route không tồn tại
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Not found' });
  });

  // Bộ xử lý lỗi toàn cục
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      res.status(err.statusCode).json({ success: false, error: err.message });
      return;
    }
    logger.error('Unhandled error', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  return app;
}
