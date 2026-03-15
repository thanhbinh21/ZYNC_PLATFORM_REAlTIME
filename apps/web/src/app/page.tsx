// Module: auth | Component: LoginPage | Type: container
// Depends: useLoginForm, LoginScreen
'use client';

import { LoginScreen } from '@/components/auth/login/login-screen';
import { useLoginForm } from '@/hooks/use-login-form';

export default function HomePage() {
  const loginForm = useLoginForm();

  return <LoginScreen {...loginForm} />;
}
