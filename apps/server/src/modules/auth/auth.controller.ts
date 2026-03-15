import { type Request, type Response, type NextFunction } from 'express';
import {
  register,
  verifyOtpAndLogin,
  refreshAccessToken,
  logout,
} from './auth.service';
import { type AuthRequest } from '../../shared/middleware/auth.middleware';

const REFRESH_TOKEN_COOKIE = 'refreshToken';
const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 ngày (ms)

// ─── POST /api/auth/register ─────────────────────────────────────────────────

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { identifier } = req.body as { identifier: string };
    await register(identifier);
    res.json({ success: true, message: 'OTP sent. Check your phone or email.' });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/verify-otp ───────────────────────────────────────────────

export async function verifyOtpHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { identifier, otp, displayName, deviceToken, platform } = req.body as {
      identifier: string;
      otp: string;
      displayName?: string;
      deviceToken?: string;
      platform?: 'ios' | 'android' | 'web';
    };

    const result = await verifyOtpAndLogin(identifier, otp, displayName, {
      deviceToken,
      platform,
    });

    // Lưu refresh token vào http-only cookie
    res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
      maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
    });

    res.json({
      success: true,
      accessToken: result.accessToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

export async function refreshHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'Refresh token not found' });
      return;
    }

    const accessToken = await refreshAccessToken(refreshToken);
    res.json({ success: true, accessToken });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────────────────────

export async function logoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization ?? '';
    const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE] as string | undefined;
    const { deviceToken } = req.body as { deviceToken?: string };

    await logout(accessToken, refreshToken, deviceToken);

    // Xoá refresh token cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE, {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

// Re-export để dùng trong routes (tránh phải gọi lại module auth.service trong routes)
export { AuthRequest };
