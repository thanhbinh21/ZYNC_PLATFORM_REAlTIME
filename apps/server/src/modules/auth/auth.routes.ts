import { Router } from 'express';
import { otpRateLimiter } from '../../shared/middleware/rate-limiter.middleware';
import { validateBody } from '../../shared/middleware/validate.middleware';
import { RegisterSchema, VerifyOtpSchema, LogoutSchema } from './auth.schema';
import {
  registerHandler,
  verifyOtpHandler,
  refreshHandler,
  logoutHandler,
} from './auth.controller';

export const authRouter = Router();

// POST /api/auth/register – request OTP via phone/email
authRouter.post('/register', otpRateLimiter, validateBody(RegisterSchema), registerHandler);

// POST /api/auth/verify-otp – verify OTP, receive JWT + refresh token cookie
authRouter.post('/verify-otp', validateBody(VerifyOtpSchema), verifyOtpHandler);

// POST /api/auth/refresh – refresh access token using http-only cookie
authRouter.post('/refresh', refreshHandler);

// POST /api/auth/logout – revoke token + clear cookie
authRouter.post('/logout', validateBody(LogoutSchema), logoutHandler);
