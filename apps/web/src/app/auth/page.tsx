'use client';

import { useEffect, useState } from 'react';
import { LoginScreen } from '@/components/auth/login/login-screen';
import { LOGIN_SCREEN_MOCK_DATA } from '@/components/auth/login/mockData';
import { useLoginForm } from '@/hooks/use-login-form';

export default function AuthPage() {
  const [isPageLoading, setIsPageLoading] = useState(true);
  const loginForm = useLoginForm();

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setIsPageLoading(false);
    }, 650);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, []);

  if (isPageLoading) {
    return (
      <main className="zync-auth-shell flex min-h-screen items-center justify-center px-4 text-text-primary">
        <div className="zync-soft-card zync-soft-card-elevated flex w-full max-w-md flex-col gap-4 rounded-[1.8rem] p-6">
          <div className="h-3 w-28 animate-pulse rounded-full bg-bg-hover" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-bg-hover" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-bg-hover" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-accent-light/50" />
        </div>
      </main>
    );
  }

  return <LoginScreen {...loginForm} mockData={LOGIN_SCREEN_MOCK_DATA} />;
}
