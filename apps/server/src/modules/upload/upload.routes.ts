import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { uploadRateLimiter } from '../../shared/middleware/rate-limiter.middleware';

export const uploadRouter = Router();

uploadRouter.use(authenticate);

uploadRouter.post('/sign', uploadRateLimiter, (req: Request, res: Response) => {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];
  const apiKey = process.env['CLOUDINARY_API_KEY'];
  const apiSecret = process.env['CLOUDINARY_API_SECRET'];

  if (!cloudName || !apiKey || !apiSecret) {
    res.status(500).json({ success: false, error: 'Cloudinary not configured' });
    return;
  }

  const folder = (req.body as { folder?: string }).folder || 'stories';
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');

  res.json({
    success: true,
    data: { signature, timestamp, apiKey, cloudName, folder },
  });
});
