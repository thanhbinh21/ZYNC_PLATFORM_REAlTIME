import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware';
import { uploadRateLimiter } from '../../shared/middleware/rate-limiter.middleware';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

export const uploadRouter = Router();

// Initialize Cloudinary when router is loaded
UploadService.initCloudinary();

uploadRouter.use(authenticate);

/**
 * Task 8.1: POST /api/upload/generate-signature
 * Generate Cloudinary signature for direct client upload
 * Request: { type: 'image' | 'video' | 'document' }
 * Response: { timestamp, signature, cloudName, apiKey, folder, publicIdPrefix }
 */
uploadRouter.post('/generate-signature', uploadRateLimiter, (req, res) => {
  void UploadController.generateSignatureHandler(req, res);
});

/**
 * Task 8.1: POST /api/upload/verify
 * Verify Cloudinary upload was successful
 * Request: { publicId: string }
 * Response: { url, secureUrl, size }
 */
uploadRouter.post('/verify', uploadRateLimiter, (req, res) => {
  void UploadController.verifyUploadHandler(req, res);
});

/**
 * Task 8.2: DELETE /api/upload/:publicId
 * Delete uploaded file from Cloudinary
 */
uploadRouter.delete('/:publicId', uploadRateLimiter, (req, res) => {
  void UploadController.deleteUploadHandler(req, res);
});
