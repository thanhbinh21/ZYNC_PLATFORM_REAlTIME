'use client';

import { useEffect, useState } from 'react';

interface PageLoadingProps {
  minDurationMs?: number;
  mode?: 'page' | 'panel';
  className?: string;
}

export function PageLoading({ minDurationMs, mode = 'page', className }: PageLoadingProps) {
  const [visible, setVisible] = useState(!minDurationMs);

  useEffect(() => {
    if (!minDurationMs) return;
    const timer = globalThis.setTimeout(() => setVisible(true), minDurationMs);
    return () => globalThis.clearTimeout(timer);
  }, [minDurationMs]);

  if (!visible) return null;

  const containerClassName = [
    mode === 'panel'
      ? 'flex h-full w-full items-center justify-center px-4 text-text-primary'
      : 'zync-page-shell flex min-h-screen items-center justify-center px-4 text-text-primary',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const cardClassName = [
    'zync-soft-card zync-soft-card-elevated flex w-full flex-col gap-4 rounded-[1.8rem] p-6 zync-reveal-up',
    mode === 'panel' ? 'max-w-sm' : 'max-w-md',
  ].join(' ');

  return (
    <div className={containerClassName} role="status" aria-live="polite" aria-busy="true">
      <div className={cardClassName}>
        <div className="h-3.5 w-36 animate-pulse rounded-full bg-bg-hover" />

        <div className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded-xl bg-bg-hover" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-bg-hover" />
        </div>

        <div className="h-11 w-full animate-pulse rounded-xl bg-accent-light/50" />
      </div>
    </div>
  );
}
