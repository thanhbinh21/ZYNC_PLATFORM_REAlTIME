'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthMode, AuthStep, LoginFormValues } from '@/components/auth/login/login.types';
import { logout, requestOtp, verifyOtp } from '@/services/auth';

const DEFAULT_FORM: LoginFormValues = {
  identifier: '',
  displayName: '',
  otp: '',
};

function normalizeIdentifier(value: string): string {
  const trimmed = value.trim();
  const compact = trimmed.replace(/\s/g, '');
  const isPhone = /^\+?\d{9,15}$/.test(compact);

  if (isPhone) {
    return compact;
  }

  return trimmed.toLowerCase();
}

function resolveDeviceToken(): string {
  if (typeof window === 'undefined') {
    return 'web-device';
  }

  const store = window.localStorage;
  const key = 'zync_web_device_token';
  const existing = store.getItem(key);
  if (existing) {
    return existing;
  }

  const generated = `web-${Math.random().toString(36).slice(2, 12)}`;
  store.setItem(key, generated);
  return generated;
}

export function useLoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('login');
  const [step, setStep] = useState<AuthStep>('input');
  const [values, setValues] = useState<LoginFormValues>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  const canRequestOtp = useMemo(() => {
    const hasIdentifier = values.identifier.trim().length >= 5;
    const hasDisplayName = mode === 'register' ? values.displayName.trim().length >= 1 : true;
    return hasIdentifier && hasDisplayName;
  }, [mode, values.displayName, values.identifier]);

  const canVerifyOtp = useMemo(() => /^\d{6}$/.test(values.otp.trim()), [values.otp]);

  const onModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setStep('input');
    setValues((prev) => ({ ...prev, otp: '' }));
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const onIdentifierChange = (value: string) => {
    setValues((prev) => ({ ...prev, identifier: value }));
    setErrorMessage(null);
  };

  const onDisplayNameChange = (value: string) => {
    setValues((prev) => ({ ...prev, displayName: value }));
    setErrorMessage(null);
  };

  const onOtpChange = (value: string) => {
    const compact = value.replace(/\D/g, '').slice(0, 6);
    setValues((prev) => ({ ...prev, otp: compact }));
    setErrorMessage(null);
  };

  const onBackToInput = () => {
    setStep('input');
    setValues((prev) => ({ ...prev, otp: '' }));
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const onRequestOtp = async () => {
    if (!canRequestOtp || isSubmitting) {
      setErrorMessage('Vui lòng nhập đầy đủ thông tin hợp lệ.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const identifier = normalizeIdentifier(values.identifier);
      await requestOtp(identifier);
      setStep('verify');
      setInfoMessage('Mã OTP đã được gửi. Vui lòng kiểm tra điện thoại hoặc email của bạn.');
      setValues((prev) => ({ ...prev, identifier, otp: '' }));
    } catch (error: unknown) {
      const fallbackMessage = 'Không thể gửi OTP. Vui lòng thử lại.';
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response: { data: { error: string } } }).response.data.error
          : fallbackMessage;
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onVerifyOtp = async () => {
    if (!canVerifyOtp || isSubmitting) {
      setErrorMessage('Vui lòng nhập mã OTP gồm 6 chữ số.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const deviceToken = resolveDeviceToken();
      const response = await verifyOtp({
        identifier: values.identifier,
        otp: values.otp,
        displayName: mode === 'register' ? values.displayName.trim() : undefined,
        deviceToken,
        platform: 'web',
      });

      (globalThis as Record<string, unknown>)['__accessToken'] = response.accessToken;
      setCurrentUserName(response.user.displayName);
      setInfoMessage('Xác thực thành công. Bạn đã đăng nhập vào hệ thống.');
      setErrorMessage(null);
      router.push('/friends');
    } catch (error: unknown) {
      const fallbackMessage = 'Xác thực OTP thất bại. Vui lòng thử lại.';
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { error?: string } } }).response?.data?.error === 'string'
          ? (error as { response: { data: { error: string } } }).response.data.error
          : fallbackMessage;
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onLogout = async () => {
    try {
      setIsSubmitting(true);
      const deviceToken = resolveDeviceToken();
      await logout({ deviceToken });
      (globalThis as Record<string, unknown>)['__accessToken'] = undefined;
      setCurrentUserName(null);
      setStep('input');
      setValues((prev) => ({ ...prev, otp: '' }));
      setInfoMessage('Bạn đã đăng xuất khỏi hệ thống.');
      setErrorMessage(null);
    } catch {
      setErrorMessage('Đăng xuất thất bại. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    mode,
    step,
    values,
    isSubmitting,
    infoMessage,
    errorMessage,
    currentUserName,
    onModeChange,
    onIdentifierChange,
    onDisplayNameChange,
    onOtpChange,
    onRequestOtp,
    onVerifyOtp,
    onBackToInput,
    onLogout,
  };
}
