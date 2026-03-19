'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  AuthMode,
  AuthStep,
  LoginFormValues,
} from '@/components/auth/login/login.types';
import {
  loginWithGoogle,
  logout,
  requestForgotPasswordOtp,
  requestOtp,
  requestPasswordOtp,
  resetForgotPassword,
  verifyOtp,
  verifyPasswordOtp,
} from '@/services/auth';

const DEFAULT_FORM: LoginFormValues = {
  identifier: '',
  displayName: '',
  password: '',
  otp: '',
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          prompt: () => void;
        };
      };
    };
  }
}

function normalizeIdentifier(value: string): string {
  const trimmed = value.trim();
  const compact = trimmed.replace(/\s/g, '');
  const isPhone = /^\+?\d{9,15}$/.test(compact);

  if (isPhone) {
    return compact;
  }

  return trimmed.toLowerCase();
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim().toLowerCase());
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
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [values, setValues] = useState<LoginFormValues>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  const canRequestOtp = useMemo(() => {
    const hasIdentifier = values.identifier.trim().length >= 5;
    const hasDisplayName = mode === 'register' ? values.displayName.trim().length >= 1 : true;
    const hasPassword = mode !== 'register' && isRecoveryFlow
      ? true
      : values.password.trim().length >= 8;
    const hasEmail = mode === 'register' ? true : isEmail(values.identifier);

    return hasIdentifier && hasDisplayName && hasPassword && hasEmail;
  }, [isRecoveryFlow, mode, values.displayName, values.identifier, values.password]);

  const canVerifyOtp = useMemo(() => {
    const hasOtp = /^\d{6}$/.test(values.otp.trim());
    if (!hasOtp) {
      return false;
    }

    if (isRecoveryFlow) {
      return values.password.trim().length >= 8;
    }

    return true;
  }, [isRecoveryFlow, values.otp, values.password]);

  useEffect(() => {
    if (typeof window === 'undefined' || window.google) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const onModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setIsRecoveryFlow(false);
    setStep('input');
    setValues((prev) => ({ ...prev, otp: '' }));
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const onStartRecovery = () => {
    setMode('login');
    setIsRecoveryFlow(true);
    setStep('input');
    setValues((prev) => ({ ...prev, otp: '' }));
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const onCancelRecovery = () => {
    setIsRecoveryFlow(false);
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

  const onPasswordChange = (value: string) => {
    setValues((prev) => ({ ...prev, password: value }));
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

      if (mode === 'register') {
        await requestOtp(identifier);
      } else if (isRecoveryFlow) {
        await requestForgotPasswordOtp({
          email: identifier,
        });
      } else {
        await requestPasswordOtp({
          email: identifier,
          password: values.password,
        });
      }

      setStep('verify');
      setInfoMessage(
        isRecoveryFlow
          ? 'Mã OTP khôi phục đã được gửi về email. Vui lòng kiểm tra hộp thư của bạn.'
          : 'Mã OTP đã được gửi. Vui lòng kiểm tra điện thoại hoặc email của bạn.',
      );
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
      if (isRecoveryFlow) {
        await resetForgotPassword({
          email: values.identifier,
          otp: values.otp,
          newPassword: values.password,
        });

        setIsRecoveryFlow(false);
        setStep('input');
        setValues((prev) => ({ ...prev, otp: '' }));
        setInfoMessage('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.');
        setErrorMessage(null);
        return;
      }

      const deviceToken = resolveDeviceToken();
      const response = mode === 'login'
        ? await verifyPasswordOtp({
            email: values.identifier,
            password: values.password,
            otp: values.otp,
            deviceToken,
            platform: 'web',
          })
        : await verifyOtp({
            identifier: values.identifier,
            otp: values.otp,
            displayName: values.displayName.trim(),
            password: values.password,
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

  const onGoogleLogin = async () => {
    if (isSubmitting) {
      return;
    }

    const clientId = process.env['NEXT_PUBLIC_GOOGLE_CLIENT_ID'];
    if (!clientId) {
      setErrorMessage('Thiếu cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID cho đăng nhập Google.');
      return;
    }

    if (typeof window === 'undefined' || !window.google?.accounts?.id) {
      setErrorMessage('Google Identity chưa sẵn sàng. Vui lòng thử lại sau vài giây.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const credential = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
          reject(new Error('Không nhận được Google credential.'));
        }, 15000);

        window.google?.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            window.clearTimeout(timeout);
            if (!response.credential) {
              reject(new Error('Không lấy được Google credential.'));
              return;
            }
            resolve(response.credential);
          },
        });

        window.google?.accounts.id.prompt();
      });

      const deviceToken = resolveDeviceToken();
      const response = await loginWithGoogle({
        idToken: credential,
        deviceToken,
        platform: 'web',
      });

      (globalThis as Record<string, unknown>)['__accessToken'] = response.accessToken;
      setCurrentUserName(response.user.displayName);
      setInfoMessage('Đăng nhập Google thành công.');
      router.push('/friends');
    } catch (error: unknown) {
      const fallbackMessage = 'Đăng nhập Google thất bại. Vui lòng thử lại.';
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
    isRecoveryFlow,
    values,
    isSubmitting,
    infoMessage,
    errorMessage,
    currentUserName,
    onModeChange,
    onStartRecovery,
    onCancelRecovery,
    onIdentifierChange,
    onDisplayNameChange,
    onPasswordChange,
    onOtpChange,
    onRequestOtp,
    onVerifyOtp,
    onGoogleLogin,
    onBackToInput,
    onLogout,
  };
}
