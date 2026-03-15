import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { UpdateProfileSchema, UpsertDeviceTokenSchema } from '../auth/auth.schema';
import {
  getMeHandler,
  getUserByIdHandler,
  updateProfileHandler,
  upsertDeviceTokenHandler,
} from './users.controller';

export const usersRouter = Router();

// All user routes require authentication
usersRouter.use(authenticate);

// GET /api/users/me – get own profile
usersRouter.get('/me', getMeHandler);

// GET /api/users/:userId – get user profile (public)
usersRouter.get('/:userId', getUserByIdHandler);

// PATCH /api/users/me – update own profile
usersRouter.patch('/me', validateBody(UpdateProfileSchema), updateProfileHandler);

// POST /api/users/me/device-token – register device token for push notifications
usersRouter.post('/me/device-token', validateBody(UpsertDeviceTokenSchema), upsertDeviceTokenHandler);
