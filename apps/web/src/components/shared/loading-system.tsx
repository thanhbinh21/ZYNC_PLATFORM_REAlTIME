'use client';

import clsx from 'clsx';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg';
type LoaderTone = 'teal' | 'light' | 'muted';

const spinnerSizeClass: Record<LoaderSize, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-14 w-14',
};

const spinnerTrackClass: Record<LoaderTone, string> = {
  teal: 'border-[#1ED8B5]/20 border-t-[#1ED8B5] border-r-[#0F766E]',
  light: 'border-white/25 border-t-white border-r-[#A7FFF0]',
  muted: 'border-slate-300/40 border-t-[#0F766E] border-r-[#1ED8B5]',
};

const dotClass: Record<LoaderTone, string> = {
  teal: 'bg-[#1ED8B5]',
  light: 'bg-[#A7FFF0]',
  muted: 'bg-[#0F766E]',
};

interface ButtonSpinnerProps {
  size?: LoaderSize;
  tone?: LoaderTone;
  className?: string;
}

export function ButtonSpinner({ size = 'sm', tone = 'light', className }: ButtonSpinnerProps) {
  return (
    <span
      className={clsx(
        'inline-block shrink-0 animate-spin rounded-full border-2',
        spinnerSizeClass[size],
        spinnerTrackClass[tone],
        className,
      )}
      aria-hidden
    />
  );
}

interface AppLoaderProps {
  message?: string;
  description?: string;
  size?: LoaderSize;
  tone?: LoaderTone;
  layout?: 'inline' | 'card' | 'bare';
  className?: string;
}

export function AppLoader({
  message = 'Đang tải...',
  description,
  size = 'lg',
  tone = 'teal',
  layout = 'card',
  className,
}: AppLoaderProps) {
  const content = (
    <>
      <span className="relative inline-flex items-center justify-center" aria-hidden>
        <span
          className={clsx(
            'inline-block animate-spin rounded-full border-[3px]',
            spinnerSizeClass[size],
            spinnerTrackClass[tone],
          )}
        />
        <span className={clsx('absolute rounded-full bg-[#082F49]/5', size === 'lg' ? 'h-7 w-7' : 'h-4 w-4')} />
      </span>

      <span className="flex items-center justify-center gap-1.5" aria-hidden>
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={clsx('h-1.5 w-1.5 rounded-full opacity-70 animate-pulse', dotClass[tone])}
            style={{ animationDelay: `${index * 150}ms` }}
          />
        ))}
      </span>

      {message ? (
        <span className={clsx('text-center font-ui-title text-sm font-bold', tone === 'light' ? 'text-white' : 'text-[#082F49]')}>
          {message}
        </span>
      ) : null}
      {description ? (
        <span className={clsx('max-w-[18rem] text-center text-xs leading-5', tone === 'light' ? 'text-teal-50/75' : 'text-slate-500')}>
          {description}
        </span>
      ) : null}
    </>
  );

  if (layout === 'inline') {
    return (
      <span className={clsx('inline-flex items-center gap-2', className)} role="status" aria-live="polite" aria-busy="true">
        <ButtonSpinner size={size} tone={tone} />
        {message ? <span>{message}</span> : null}
      </span>
    );
  }

  if (layout === 'bare') {
    return (
      <div className={clsx('flex flex-col items-center justify-center gap-3', className)} role="status" aria-live="polite" aria-busy="true">
        {content}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'flex w-full max-w-[21rem] flex-col items-center justify-center gap-4 rounded-[1.7rem] border border-[#1ED8B5]/20 bg-[#06372F] px-8 py-8 shadow-[0_34px_90px_-50px_rgba(6,55,47,0.9)]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {content}
    </div>
  );
}

interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  description?: string;
  className?: string;
}

export function LoadingOverlay({
  open,
  message = 'Đang xử lý...',
  description,
  className,
}: LoadingOverlayProps) {
  if (!open) return null;

  return (
    <div
      className={clsx('fixed inset-0 z-[200] flex items-center justify-center bg-[#041F1A]/55 p-4 backdrop-blur-sm', className)}
      aria-modal="true"
      role="dialog"
    >
      <AppLoader message={message} description={description} tone="light" />
    </div>
  );
}

interface PageSkeletonProps {
  rows?: number;
  className?: string;
}

export function PageSkeleton({ rows = 3, className }: PageSkeletonProps) {
  return (
    <div className={clsx('flex w-full flex-col gap-4 rounded-[1.7rem] border border-border bg-[var(--surface-card)] p-5', className)}>
      <div className="zync-skeleton h-4 w-36 rounded-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="zync-skeleton h-11 w-11 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="zync-skeleton h-3.5 rounded-full" style={{ width: index % 2 === 0 ? '70%' : '55%' }} />
            <div className="zync-skeleton h-3 rounded-full" style={{ width: index % 2 === 0 ? '45%' : '62%' }} />
          </div>
        </div>
      ))}
      <div className="zync-skeleton h-11 w-full rounded-full" />
    </div>
  );
}
