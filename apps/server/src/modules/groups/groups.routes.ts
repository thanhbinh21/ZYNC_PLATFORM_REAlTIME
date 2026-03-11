import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';

export const groupsRouter = Router();

groupsRouter.use(authenticate);

// POST /api/groups – create group
groupsRouter.post('/', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// PATCH /api/groups/:groupId – update group (admin only)
groupsRouter.patch('/:groupId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// POST /api/groups/:groupId/members – add members
groupsRouter.post('/:groupId/members', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// DELETE /api/groups/:groupId/members/:userId – remove member
groupsRouter.delete('/:groupId/members/:userId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// DELETE /api/groups/:groupId/members/me – leave group
groupsRouter.delete('/:groupId/members/me', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// DELETE /api/groups/:groupId – disband group (admin only)
groupsRouter.delete('/:groupId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
