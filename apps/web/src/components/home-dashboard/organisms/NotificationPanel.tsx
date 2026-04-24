'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Notification } from '@/services/notifications';

interface NotificationPanelProps {
  notifications: Notification[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (ids: string[]) => void;
  onClickNotification: (notification: Notification) => void;
  onClose: () => void;
  onOpenSettings: () => void;
}

const TYPE_ICONS: Record<Notification['type'], string> = {
  new_message: 'DM',
  friend_request: 'FR',
  friend_accepted: 'OK',
  group_invite: 'GR',
  story_reaction: 'RT',
  story_reply: 'RP',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'vua xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phut truoc`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} gio truoc`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngay truoc`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export function NotificationPanel({
  notifications,
  isLoading,
  hasMore,
  onLoadMore,
  onMarkAllRead,
  onMarkRead,
  onClickNotification,
  onClose,
  onOpenSettings,
}: NotificationPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  const handleClickItem = (notification: Notification) => {
    if (!notification.read) onMarkRead([notification._id]);
    onClickNotification(notification);
  };

  const unreadCount = notifications.filter((item) => !item.read).length;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-[calc(100%+10px)] z-50 w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[1.6rem] zync-soft-glass"
      style={{ animation: 'panelSlide 0.2s ease-out' }}
      role="dialog"
      aria-label="Danh sach thong bao"
    >
      <div className="flex items-center justify-between border-b border-border-light px-4 py-3">
        <div>
          <h3 className="font-ui-title text-base text-text-primary">Thong bao</h3>
          <p className="font-ui-content text-xs text-text-tertiary">{unreadCount} muc chua doc</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button type="button" onClick={onMarkAllRead} className="zync-soft-button-ghost px-2.5 py-1 text-xs">
              Doc het
            </button>
          )}
          <button type="button" onClick={onOpenSettings} className="zync-soft-button-ghost h-8 w-8 p-0" aria-label="Cai dat thong bao">
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
              <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 4.5v2.1M12 17.4v2.1M4.5 12h2.1M17.4 12h2.1M6.8 6.8l1.5 1.5M15.7 15.7l1.5 1.5M17.2 6.8l-1.5 1.5M8.3 15.7l-1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <button type="button" onClick={onClose} className="zync-soft-button-ghost h-8 w-8 p-0" aria-label="Dong">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={scrollRef} onScroll={handleScroll} className="max-h-[420px] overflow-y-auto px-2 py-2">
        {notifications.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
            <span className="zync-soft-badge">Inbox zero</span>
            <p className="font-ui-content text-sm text-text-secondary">Khong co thong bao nao</p>
          </div>
        )}

        {notifications.map((notification) => (
          <button
            key={notification._id}
            type="button"
            onClick={() => handleClickItem(notification)}
            className={`mb-2 flex w-full items-start gap-3 rounded-[1.2rem] border px-4 py-3 text-left transition ${
              notification.read
                ? 'border-transparent bg-white/45 hover:border-border hover:bg-white/70'
                : 'border-border bg-accent-light hover:border-accent'
            }`}
          >
            <div className="mt-1.5 flex-shrink-0">
              {!notification.read ? (
                <span className="block h-2.5 w-2.5 rounded-full bg-accent shadow-sm" />
              ) : (
                <span className="block h-2.5 w-2.5 rounded-full bg-border" />
              )}
            </div>

            <span className="mt-0.5 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-border bg-white/70 text-[0.66rem] font-semibold text-accent-strong">
              {TYPE_ICONS[notification.type] ?? 'NT'}
            </span>

            <div className="min-w-0 flex-1">
              <p className="font-ui-title text-[13px] leading-snug text-text-primary">{notification.title}</p>
              <p className="font-ui-content mt-0.5 truncate text-xs text-text-secondary">{notification.body}</p>
              <p className="font-ui-content mt-1 text-[10px] text-text-tertiary">{relativeTime(notification.createdAt)}</p>
            </div>
          </button>
        ))}

        {isLoading && (
          <div className="space-y-2 px-2 py-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-[1.2rem] border border-border bg-white/60 px-4 py-3">
                <div className="h-3 w-24 animate-pulse rounded bg-bg-hover" />
                <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes panelSlide {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
