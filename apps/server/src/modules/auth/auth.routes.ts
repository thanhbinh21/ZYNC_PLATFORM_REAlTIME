import { Router } from 'express';
import { otpRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

export const authRouter = Router();

// POST /api/auth/register – request OTP via phone/email
authRouter.post('/register', otpRateLimiter, (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// POST /api/auth/verify-otp – verify OTP, receive JWT
authRouter.post('/verify-otp', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// POST /api/auth/refresh – refresh access token using http-only cookie
authRouter.post('/refresh', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});

// POST /api/auth/logout – revoke token + clear cookie
authRouter.post('/logout', (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
