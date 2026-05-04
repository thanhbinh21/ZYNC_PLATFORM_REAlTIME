'use client';

import { useEffect, useState } from 'react';

interface PageLoadingProps {
  /**
   * Optional minimum display time in ms (simulates realistic loading).
   * If omitted, component is invisible (for Suspense boundaries).
   */
  minDurationMs?: number;
}

/**
 * Shared page loading skeleton.
 * Matches the auth page style: a centered card with animated skeleton lines.
 *
 * Usage with Suspense:
 *   <Suspense fallback={<PageLoading />}>
 *     <HeavyComponent />
 *   </Suspense>
 *
 * Usage with fake delay:
 *   <Suspense fallback={<PageLoading minDurationMs={650} />}>
 *     <HeavyComponent />
 *   </Suspense>
 */
export function PageLoading({ minDurationMs }: PageLoadingProps) {
  const [visible, setVisible] = useState(!minDurationMs);

  useEffect(() => {
    if (!minDurationMs) return;
    const timer = globalThis.setTimeout(() => setVisible(true), minDurationMs);
    return () => globalThis.clearTimeout(timer);
  }, [minDurationMs]);

  if (!visible) return null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 text-text-primary">
      <div className="zync-soft-card zync-soft-card-elevated flex w-full max-w-md flex-col gap-4 rounded-[1.8rem] p-6">
        {/* Title skeleton */}
        <div className="h-3.5 w-36 animate-pulse rounded-full bg-bg-hover" />

        {/* Form field skeletons */}
        <div className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded-xl bg-bg-hover" />
          <div className="h-10 w-full animate-pulse rounded-xl bg-bg-hover" />
        </div>

        {/* Button skeleton */}
        <div className="h-11 w-full animate-pulse rounded-xl bg-accent-light/50" />
      </div>
    </main>
  );
}
