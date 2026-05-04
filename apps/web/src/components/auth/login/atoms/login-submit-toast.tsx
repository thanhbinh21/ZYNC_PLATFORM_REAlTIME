'use client';

import { useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

type ToastVariant = 'info' | 'success' | 'error';

interface LoginSubmitToastProps {
  message: string | null;
  variant?: ToastVariant;
  onDismiss: () => void;
  duration?: number;
}

export function LoginSubmitToast({ message, variant = 'info', onDismiss, duration = 4000 }: LoginSubmitToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onDismiss, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [message, duration, onDismiss]);

  if (!message) return null;

  const isSuccess = variant === 'success';
  const isError = variant === 'error';
  const isInfo = variant === 'info';

  const borderColor = isSuccess
    ? 'border-emerald-500/60'
    : isError
      ? 'border-red-500/60'
      : 'border-[#1a5c4a]/70';

  const bgColor = isSuccess
    ? 'bg-emerald-950/90'
    : isError
      ? 'bg-red-950/90'
      : 'bg-[#062a21]/90';

  const iconColor = isSuccess
    ? 'text-emerald-400'
    : isError
      ? 'text-red-400'
      : 'text-[#6db39e]';

  const textColor = isSuccess
    ? 'text-emerald-100'
    : isError
      ? 'text-red-100'
      : 'text-[#e4fff5]';

  const subColor = isSuccess
    ? 'text-emerald-300/70'
    : isError
      ? 'text-red-300/70'
      : 'text-[#a8d8c7]';

  return (
    <div
      className={`w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border ${borderColor} ${bgColor} shadow-[0_16px_60px_rgba(0,0,0,0.45)] backdrop-blur-md`}
      style={{ animation: 'loginToastSlide 0.22s cubic-bezier(0.16, 1, 0.3, 1)' }}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border ${borderColor} ${isInfo ? 'bg-[#0a3b2f]/70' : isSuccess ? 'bg-emerald-900/40' : 'bg-red-900/40'} ${iconColor}`}>
          {isSuccess ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : isError ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className={`font-ui-title truncate text-sm ${textColor}`}>{message}</p>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className={`flex-shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-lg ${subColor} hover:bg-white/10 transition`}
          aria-label="Đóng"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
