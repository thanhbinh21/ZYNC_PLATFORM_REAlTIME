'use client';

import { Toaster as HotToaster, toast as hotToast } from 'react-hot-toast';

export const Toaster = () => {
  return (
    <HotToaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.95rem',
        },
        success: {
          iconTheme: {
            primary: 'var(--accent)',
            secondary: 'var(--bg-primary)',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: 'var(--bg-primary)',
          },
        },
      }}
    />
  );
};

export const toast = {
  success: (message: string) => hotToast.success(message),
  error: (message: string) => hotToast.error(message),
  info: (message: string) => hotToast(message, { icon: 'ℹ️' }),
  warning: (message: string) => hotToast(message, { icon: '⚠️' }),
  dismiss: (toastId?: string) => hotToast.dismiss(toastId),
};
