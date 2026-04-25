// Module: home | Component: HomePage | Type: container
// Depends: home screen data
'use client';

import { useEffect, useState } from 'react';
import { HOME_MOCK_DATA } from '@/components/home/mockData';
import { HomeScreen } from '@/components/home/organisms/home-screen';

export default function HomePage() {
  const [isPageLoading, setIsPageLoading] = useState(true);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setIsPageLoading(false);
    }, 700);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, []);

  if (isPageLoading) {
    return (
      <main className="zync-page-shell flex min-h-screen items-center justify-center px-4">
        <div className="zync-soft-card zync-soft-card-elevated flex max-w-md flex-col items-center gap-4 rounded-[1.8rem] px-8 py-7 text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
          <p className="font-ui-title text-lg text-text-primary">Zync dang khoi tao...</p>
          <p className="font-ui-content text-sm text-text-secondary">Chuan bi khong gian tro chuyen cho ban</p>
        </div>
      </main>
    );
  }

  return <HomeScreen data={HOME_MOCK_DATA} />;
}
