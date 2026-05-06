'use client';

import { LoginScreen } from '@/components/auth/login/login-screen';
import { LOGIN_SCREEN_MOCK_DATA } from '@/components/auth/login/mockData';
import { useLoginForm } from '@/hooks/use-login-form';
import { PageLoading } from '@/components/shared/page-loading';
import { Suspense } from 'react';

function AuthPageContent() {
  const loginForm = useLoginForm();
  return <LoginScreen {...loginForm} mockData={LOGIN_SCREEN_MOCK_DATA} />;
}

export default function AuthPage() {
  return (
    <Suspense fallback={<PageLoading minDurationMs={650} />}>
      <AuthPageContent />
    </Suspense>
  );
}
