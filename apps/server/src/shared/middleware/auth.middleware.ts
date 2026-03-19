import { type Request, type Response, type NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';
import { getRedis } from '../../infrastructure/redis';

export interface AuthRequest extends Request {
  userId: string;
}

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }

  const token = header.slice(7);
  const secret = process.env['JWT_SECRET'];
  if (!secret) throw new Error('JWT_SECRET not configured');

  try {
    const payload = jwt.verify(token, secret) as { sub: string; jti?: string };

    if (!payload?.sub) {
      return next(new UnauthorizedError('Invalid token payload'));
    }

    if (payload.jti) {
      const redis = getRedis();
      const blacklisted = await redis.get(`blacklist:token:${payload.jti}`);
      if (blacklisted) {
        return next(new UnauthorizedError('Token has been revoked'));
      }
    }

    (req as AuthRequest).userId = payload.sub;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}
