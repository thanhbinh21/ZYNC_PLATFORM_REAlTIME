import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';

export const conversationsRouter = Router();

conversationsRouter.use(authenticate);

// GET /api/conversations – list conversations (cursor paginated)
conversationsRouter.get('/', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// GET /api/conversations/:conversationId
conversationsRouter.get('/:conversationId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
