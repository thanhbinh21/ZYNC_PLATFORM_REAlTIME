'use client';

import { LoginScreen } from '@/components/auth/login/login-screen';
import { LOGIN_SCREEN_MOCK_DATA } from '@/components/auth/login/mockData';
import { useLoginForm } from '@/hooks/use-login-form';
import { PageLoading } from '@/components/shared/page-loading';

export default function AuthPage() {
  const loginForm = useLoginForm();

  return (
    <>
      {/* Suspense fallback for Next.js router loading */}
      <PageLoading minDurationMs={650} />

      <LoginScreen {...loginForm} mockData={LOGIN_SCREEN_MOCK_DATA} />
    </>
  );
}
