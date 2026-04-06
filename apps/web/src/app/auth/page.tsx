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
      <main className="zync-auth-shell flex min-h-screen items-center justify-center text-[#dffcf2]">
        <div className="flex w-[92%] max-w-md flex-col gap-4 rounded-3xl border border-[#1b5a48] bg-[#0b362c]/70 p-6 backdrop-blur-xl">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#2ed9ae]/50" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-[#124738]" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-[#124738]" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-[#2ac79c]/40" />
        </div>
      </main>
    );
  }

  return <LoginScreen {...loginForm} mockData={LOGIN_SCREEN_MOCK_DATA} />;
}
