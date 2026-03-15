// Module: auth | Component: useLoginForm | Type: hook
// Depends: React useMemo useState
'use client';

import { useMemo, useState } from 'react';
import type { LoginFormValues } from '@/components/auth/login/login.types';

const DEFAULT_FORM: LoginFormValues = {
  phoneNumber: '',
  password: '',
  rememberMe: false,
};

export function useLoginForm() {
  const [values, setValues] = useState<LoginFormValues>(DEFAULT_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    return values.phoneNumber.trim().length >= 9 && values.password.trim().length >= 6;
  }, [values]);

  const onPhoneChange = (value: string) => {
    setValues((prev) => ({ ...prev, phoneNumber: value }));
    setErrorMessage(null);
  };

  const onPasswordChange = (value: string) => {
    setValues((prev) => ({ ...prev, password: value }));
    setErrorMessage(null);
  };

  const onToggleRemember = () => {
    setValues((prev) => ({ ...prev, rememberMe: !prev.rememberMe }));
  };

  const onToggleShowPassword = () => {
    setShowPassword((prev) => !prev);
  };

  const onSubmit = async () => {
    if (!canSubmit || isSubmitting) {
      setErrorMessage('So dien thoai hoac mat khau khong hop le.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      await new Promise((resolve) => setTimeout(resolve, 850));
    } catch {
      setErrorMessage('Dang nhap that bai. Vui long thu lai.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    values,
    isSubmitting,
    showPassword,
    errorMessage,
    onPhoneChange,
    onPasswordChange,
    onToggleRemember,
    onToggleShowPassword,
    onSubmit,
  };
}
