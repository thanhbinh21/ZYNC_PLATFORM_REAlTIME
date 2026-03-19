'use client';

import { LoginScreen } from '@/components/auth/login/login-screen';
import { LOGIN_SCREEN_MOCK_DATA } from '@/components/auth/login/mockData';
import { useLoginForm } from '@/hooks/use-login-form';

export default function AuthPage() {
  const loginForm = useLoginForm();
  return <LoginScreen {...loginForm} mockData={LOGIN_SCREEN_MOCK_DATA} />;
}
