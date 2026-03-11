import rateLimit from 'express-rate-limit';

/** Rate limit OTP: 3 lần/giờ/IP */
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { success: false, error: 'OTP rate limit exceeded. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limit upload pre-signed URL: 10 lần/phút/user */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.headers['x-user-id'] as string ?? req.ip ?? 'unknown',
  message: { success: false, error: 'Upload rate limit exceeded. Try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limit kết bạn: 20 lần/giờ/user */
export const friendRequestRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.headers['x-user-id'] as string ?? req.ip ?? 'unknown',
  message: { success: false, error: 'Friend request rate limit exceeded. Try again in 1 hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/** Rate limit chung: 100 lần/phút/IP */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});
