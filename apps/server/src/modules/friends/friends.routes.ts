import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { friendRequestRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

export const friendsRouter = Router();

friendsRouter.use(authenticate);

// POST /api/friends/request – send friend request
friendsRouter.post('/request', friendRequestRateLimiter, (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// PUT /api/friends/request/:requestId/accept
friendsRouter.put('/request/:requestId/accept', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// PUT /api/friends/request/:requestId/reject
friendsRouter.put('/request/:requestId/reject', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// DELETE /api/friends/:friendId – unfriend
friendsRouter.delete('/:friendId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// POST /api/friends/:userId/block
friendsRouter.post('/:userId/block', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// DELETE /api/friends/:userId/block – unblock
friendsRouter.delete('/:userId/block', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// GET /api/friends – list friends (cursor paginated)
friendsRouter.get('/', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
