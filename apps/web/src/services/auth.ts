import { apiClient } from './api';

interface RegisterResponse {
  success: boolean;
  message: string;
}

interface VerifyOtpResponse {
  success: boolean;
  accessToken: string;
  user: {
    id: string;
    displayName: string;
    phoneNumber?: string;
    email?: string;
    avatarUrl?: string;
  };
}

export async function requestOtp(identifier: string): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/auth/register', {
    identifier,
  });
  return data;
}

export async function verifyOtp(payload: {
  identifier: string;
  otp: string;
  displayName?: string;
  password?: string;
  deviceToken?: string;
  platform?: 'web';
}): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post<VerifyOtpResponse>('/api/auth/verify-otp', payload);
  return data;
}

export async function requestPasswordOtp(payload: {
  email: string;
  password: string;
}): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/auth/login-password/request-otp', payload);
  return data;
}

export async function verifyPasswordOtp(payload: {
  email: string;
  password: string;
  otp: string;
  deviceToken?: string;
  platform?: 'web';
}): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post<VerifyOtpResponse>('/api/auth/login-password/verify-otp', payload);
  return data;
}

export async function requestForgotPasswordOtp(payload: {
  identifier: string;
}): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/auth/forgot-password/request-otp', payload);
  return data;
}

export async function resetForgotPassword(payload: {
  identifier: string;
  otp: string;
  newPassword: string;
}): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>('/api/auth/forgot-password/reset', payload);
  return data;
}

export async function loginWithGoogle(payload: {
  idToken: string;
  deviceToken?: string;
  platform?: 'web';
}): Promise<VerifyOtpResponse> {
  const { data } = await apiClient.post<VerifyOtpResponse>('/api/auth/google', payload);
  return data;
}

export async function logout(payload: { deviceToken?: string }): Promise<void> {
  await apiClient.post('/api/auth/logout', payload);
}
