import { z } from 'zod';

/** Nhận dạng người dùng – có thể là số ĐT hoặc email */
const phoneRegex = /^\+?\d{9,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const identifierSchema = z
  .string()
  .trim()
  .min(5, 'Identifier must be at least 5 characters')
  .refine((value) => {
    const compact = value.replace(/\s/g, '');
    return phoneRegex.test(compact) || emailRegex.test(value.toLowerCase());
  }, 'Identifier must be a valid phone number or email');

export const RegisterSchema = z.object({
  identifier: identifierSchema,
});
export type RegisterDto = z.infer<typeof RegisterSchema>;

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters');

const emailIdentifierSchema = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => emailRegex.test(value), 'Email must be valid');

export const VerifyOtpSchema = z.object({
  identifier: identifierSchema,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  displayName: z.string().min(1).max(50).optional(),
  password: passwordSchema,
  deviceToken: z.string().optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});
export type VerifyOtpDto = z.infer<typeof VerifyOtpSchema>;

export const LoginPasswordRequestOtpSchema = z.object({
  email: emailIdentifierSchema,
  password: passwordSchema,
});
export type LoginPasswordRequestOtpDto = z.infer<typeof LoginPasswordRequestOtpSchema>;

export const LoginPasswordVerifyOtpSchema = z.object({
  email: emailIdentifierSchema,
  password: passwordSchema,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  deviceToken: z.string().optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});
export type LoginPasswordVerifyOtpDto = z.infer<typeof LoginPasswordVerifyOtpSchema>;

export const GoogleLoginSchema = z.object({
  idToken: z.string().min(20, 'Google idToken is required'),
  deviceToken: z.string().optional(),
  platform: z.enum(['ios', 'android', 'web']).optional(),
});
export type GoogleLoginDto = z.infer<typeof GoogleLoginSchema>;

export const ForgotPasswordRequestOtpSchema = z.object({
  email: emailIdentifierSchema,
});
export type ForgotPasswordRequestOtpDto = z.infer<typeof ForgotPasswordRequestOtpSchema>;

export const ForgotPasswordResetSchema = z.object({
  email: emailIdentifierSchema,
  otp: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  newPassword: passwordSchema,
});
export type ForgotPasswordResetDto = z.infer<typeof ForgotPasswordResetSchema>;

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
