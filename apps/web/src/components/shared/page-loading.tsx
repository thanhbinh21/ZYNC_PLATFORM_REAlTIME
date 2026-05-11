'use client';

import { useEffect, useState, Suspense } from 'react';
import {
  SkeletonChatPage,
  SkeletonFriendsPage,
  SkeletonCommunityPage,
  SkeletonProfilePage,
  SkeletonExplorePage,
  SkeletonHomePage,
  SkeletonSettingsPage,
} from './ZyncPageSkeleton';

export type PageLoadingVariant =
  | 'generic'
  | 'chat'
  | 'friends'
  | 'community'
  | 'profile'
  | 'explore'
  | 'home'
  | 'settings';

export interface PageLoadingProps {
  minDurationMs?: number;
  mode?: 'page' | 'panel';
  className?: string;
  /** Render a specific page skeleton instead of the default generic card */
  variant?: PageLoadingVariant;
}

/** Maps variant → actual skeleton component */
function SkeletonForVariant({ variant }: { variant: PageLoadingVariant }) {
  switch (variant) {
    case 'chat':
      return <SkeletonChatPage />;
    case 'friends':
      return <SkeletonFriendsPage />;
    case 'community':
      return <SkeletonCommunityPage />;
    case 'profile':
      return <SkeletonProfilePage />;
    case 'explore':
      return <SkeletonExplorePage />;
    case 'home':
      return <SkeletonHomePage />;
    case 'settings':
      return <SkeletonSettingsPage />;
    default:
      return null;
  }
}

export function PageLoading({
  minDurationMs,
  mode = 'page',
  className,
  variant = 'generic',
}: PageLoadingProps) {
  const [visible, setVisible] = useState(!minDurationMs);

  useEffect(() => {
    if (!minDurationMs) return;
    const timer = globalThis.setTimeout(() => setVisible(true), minDurationMs);
    return () => globalThis.clearTimeout(timer);
  }, [minDurationMs]);

  if (!visible) return null;

  /* Variant-specific page skeleton */
  if (variant !== 'generic') {
    const containerClassName = [
      mode === 'panel'
        ? 'flex h-full w-full overflow-hidden bg-bg-primary'
        : 'flex min-h-screen w-full overflow-hidden bg-bg-primary',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={containerClassName} role="status" aria-live="polite" aria-busy="true">
        <SkeletonForVariant variant={variant} />
      </div>
    );
  }

  /* Legacy generic card (backward-compatible) */
  const containerClassName = [
    mode === 'panel'
      ? 'flex h-full w-full items-center justify-center px-4 text-text-primary bg-[var(--surface-card)]'
      : 'flex min-h-screen w-full items-center justify-center px-4 text-text-primary bg-[var(--bg-primary)]',
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

/* ============================================================
 * Page-level Suspense wrapper with PageLoading skeleton
 * Usage: <PageSuspense variant="home"><ActualContent /></PageSuspense>
 * ============================================================ */
export interface PageSuspenseProps {
  variant?: PageLoadingVariant;
  mode?: 'page' | 'panel';
  children: React.ReactNode;
}

export function PageSuspense({ variant = 'generic', mode = 'page', children }: PageSuspenseProps) {
  return (
    <Suspense fallback={<PageLoading variant={variant} mode={mode} />}>
      {children}
    </Suspense>
  );
}
