// Module: auth | Component: LoginPage | Type: container
// Depends: useLoginForm, LoginScreen
'use client';

import { LoginScreen } from '@/components/auth/login/login-screen';
import { LOGIN_SCREEN_MOCK_DATA } from '@/components/auth/login/mockData';
import { useLoginForm } from '@/hooks/use-login-form';

export default function HomePage() {
  const loginForm = useLoginForm();

  return <LoginScreen {...loginForm} mockData={LOGIN_SCREEN_MOCK_DATA} />;
}
