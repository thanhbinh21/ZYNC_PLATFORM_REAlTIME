import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { uploadRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

export const uploadRouter = Router();

uploadRouter.use(authenticate);

// POST /api/upload/sign
// Client gui { folder, publicId }, server tra ve Cloudinary signature + timestamp + api_key
// Client dung cac tham so nay de upload truc tiep len Cloudinary CDN (khong qua server)
uploadRouter.post('/sign', uploadRateLimiter, (_req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented yet' });
});
