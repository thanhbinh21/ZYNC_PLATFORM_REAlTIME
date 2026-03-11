import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';

export const messagesRouter = Router();

messagesRouter.use(authenticate);

// GET /api/messages/:conversationId – fetch messages (cursor paginated)
messagesRouter.get('/:conversationId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
