import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { listConversationsHandler } from './conversations.controller';

export const conversationsRouter = Router();

conversationsRouter.use(authenticate);

// GET /api/conversations – list conversations (cursor paginated, hiện tại lấy tất cả)
conversationsRouter.get('/', listConversationsHandler);

// GET /api/conversations/:conversationId
conversationsRouter.get('/:conversationId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
