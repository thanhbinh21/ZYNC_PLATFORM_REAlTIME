import type { FriendUser } from '@/services/friends';

interface FriendsStatusBadgeProps {
  status?: FriendUser['status'];
  size?: 'sm' | 'md';
}

export function FriendsStatusBadge({ status, size = 'md' }: FriendsStatusBadgeProps) {
  if (!status) return null;

  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
  };

  const statusConfig = {
    online: {
      bg: 'bg-emerald-500',
      shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      label: 'Trực tuyến',
    },
    away: {
      bg: 'bg-amber-500',
      shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      label: 'Vắng mặt',
    },
    offline: {
      bg: 'bg-slate-400',
      shadow: '',
      label: 'Ngoại tuyến',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={`${sizeClasses[size]} ${config.bg} ${config.shadow} rounded-full border-2 border-[var(--bg-primary)]`}
      title={config.label}
      aria-label={config.label}
    />
  );
}
