import type { DashboardIconName } from '../home-dashboard.types';

interface DashboardIconProps {
  name: DashboardIconName;
  className?: string;
}

export function DashboardIcon({ name, className = 'h-4 w-4' }: DashboardIconProps) {
  if (name === 'home') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
        <path d="M12 3 3 10v10h6v-6h6v6h6V10l-9-7Z" />
      </svg>
    );
  }

  if (name === 'chat' || name === 'message') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M6 5h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-7l-4 3v-3H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'profile') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
        <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'friends') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="9" cy="9" r="2.7" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="16" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.5 18c.8-2 2.5-3.2 4.5-3.2s3.7 1.2 4.5 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M14 18c.4-1.2 1.3-2 2.5-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'group') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="8" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12.5" cy="8.5" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="17" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4 18c.6-1.8 2-2.8 4-2.8s3.4 1 4 2.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M12.5 18c.5-1.5 1.7-2.3 3.4-2.3S18.8 16.5 19.3 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'plus') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'edit') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M4 20h4l10-10a2 2 0 0 0-4-4L4 16v4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'search') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="1.8" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'bell') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M6 10a6 6 0 0 1 12 0v4l1.5 2H4.5L6 14v-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === 'gear' || name === 'settings') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 4.5v2.1M12 17.4v2.1M4.5 12h2.1M17.4 12h2.1M6.8 6.8l1.5 1.5M15.7 15.7l1.5 1.5M17.2 6.8l-1.5 1.5M8.3 15.7l-1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === 'logout') {
    return (
      <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
        <path d="M9 5H5v14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="m13 8 4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M5 7h14v10H5z" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 7V5h6v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
