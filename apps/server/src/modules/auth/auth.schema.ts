import { z } from 'zod';

/** Nhận dạng người dùng – có thể là số ĐT hoặc email */
const identifierSchema = z.string().min(5, 'Identifier must be at least 5 characters');

export const RegisterSchema = z.object({
  identifier: identifierSchema,
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

export const VerifyOtpSchema = z.object({
  identifier: identifierSchema,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  displayName: z.string().min(1).max(50).optional(),
  deviceToken: z.string().optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(200).optional(),
});
export type UpdateProfileDto = z.infer<typeof UpdateProfileSchema>;

export const UpsertDeviceTokenSchema = z.object({
  deviceToken: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});
export type UpsertDeviceTokenDto = z.infer<typeof UpsertDeviceTokenSchema>;

export const LogoutSchema = z.object({
  deviceToken: z.string().min(1).optional(),
});
export type LogoutDto = z.infer<typeof LogoutSchema>;
