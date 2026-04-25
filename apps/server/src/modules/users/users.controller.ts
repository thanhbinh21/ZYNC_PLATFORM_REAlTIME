import { type Request, type Response, type NextFunction } from 'express';
import { type AuthRequest } from '../../shared/middleware/auth.middleware';
import {
  getMe,
  getUserById,
  searchUsers,
  updateProfile,
  upsertDeviceToken,
  discoverUsers,
} from './users.service';
import type { UpdateProfileDto, UpsertDeviceTokenDto } from '../auth/auth.schema';

// ─── GET /api/users/me ────────────────────────────────────────────────────────

export async function getMeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const user = await getMe(userId);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/users/:userId ───────────────────────────────────────────────────

export async function getUserByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId: requesterId } = req as AuthRequest;
    const user = await getUserById(req.params['userId'] as string, requesterId);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/users/search ───────────────────────────────────────────────────

export async function searchUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const query = ((req.query['query'] as string | undefined) ?? (req.query['q'] as string | undefined) ?? '');
    const limitRaw = Number(req.query['limit'] ?? 10);
    const users = await searchUsers(userId, query, limitRaw);
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/users/me ──────────────────────────────────────────────────────

export async function updateProfileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const user = await updateProfile(userId, req.body as UpdateProfileDto);
    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/users/me/device-token ─────────────────────────────────────────

export async function upsertDeviceTokenHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    await upsertDeviceToken(userId, req.body as UpsertDeviceTokenDto);
    res.json({ success: true, message: 'Device token registered' });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/users/discover ──────────────────────────────────────────────────────────────────────────────────

export async function discoverUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId } = req as AuthRequest;
    const users = await discoverUsers(userId);
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}
