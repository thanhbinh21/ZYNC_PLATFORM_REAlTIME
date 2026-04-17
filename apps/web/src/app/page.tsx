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
      <main className="zync-auth-shell flex min-h-screen items-center justify-center text-[#dffcf2]">
        <div className="zync-glass-panel zync-glass-panel-strong flex flex-col items-center gap-4 rounded-2xl px-8 py-7">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#2ed9ae]/30 border-t-[#43f0c2]" />
          <p className="font-ui-title text-lg">Zync đang khởi tạo...</p>
          <p className="font-ui-content text-sm text-[#d1ede3]">Chuẩn bị không gian trò chuyện cho bạn</p>
        </div>
      </main>
    );
  }

  return <HomeScreen data={HOME_MOCK_DATA} />;
}
