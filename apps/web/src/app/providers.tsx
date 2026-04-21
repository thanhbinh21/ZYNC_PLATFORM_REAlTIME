'use client';

import { InAppNotificationToasts } from '@/components/notifications/InAppNotificationToasts';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <InAppNotificationToasts />
    </>
  );
}

