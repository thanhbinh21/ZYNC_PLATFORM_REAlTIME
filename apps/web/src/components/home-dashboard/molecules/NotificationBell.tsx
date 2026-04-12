'use client';

import { useEffect, useRef, useState } from 'react';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface NotificationBellProps {
  unreadCount: number;
  onClick: () => void;
  isOpen: boolean;
}

export function NotificationBell({ unreadCount, onClick, isOpen }: NotificationBellProps) {
  const [pulse, setPulse] = useState(false);
  const prevCountRef = useRef(unreadCount);

  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 1200);
      return () => clearTimeout(timer);
    }
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  const badgeText = unreadCount > 99 ? '99+' : String(unreadCount);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
        isOpen
          ? 'bg-[#14463a] ring-1 ring-[#30d7ab]/40 text-[#30d7ab]'
          : 'bg-[#0d3128] text-[#cdece0] hover:bg-[#14463a]'
      }`}
      aria-label={`Thông báo${unreadCount > 0 ? ` (${unreadCount} chưa đọc)` : ''}`}
    >
      <DashboardIcon name="bell" className={`h-4 w-4 ${pulse ? 'animate-[bellSwing_0.6s_ease-in-out]' : ''}`} />

      {unreadCount > 0 && (
        <span
          className={`absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#f04848] px-1 font-ui-title text-[10px] font-bold leading-none text-white shadow-[0_0_8px_rgba(240,72,72,0.5)] ${
            pulse ? 'animate-[badgePop_0.4s_ease-out]' : ''
          }`}
        >
          {badgeText}
        </span>
      )}

      <style jsx>{`
        @keyframes bellSwing {
          0% { transform: rotate(0deg); }
          15% { transform: rotate(14deg); }
          30% { transform: rotate(-12deg); }
          45% { transform: rotate(8deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(3deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes badgePop {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.25); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </button>
  );
}
