import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';

export const usersRouter = Router();

// All user routes require authentication
usersRouter.use(authenticate);

// GET /api/users/me – get own profile
usersRouter.get('/me', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// GET /api/users/:userId – get user profile
usersRouter.get('/:userId', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// PATCH /api/users/me – update own profile
usersRouter.patch('/me', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
