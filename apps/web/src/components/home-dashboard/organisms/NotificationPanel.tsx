'use client';

import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  new_message: '💬',
  friend_request: '🤝',
  friend_accepted: '🎉',
  group_invite: '👥',
  story_reaction: '❤️',
  story_reply: '💭',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // J2.9 – Close on outside click is handled by the overlay's onClick

  // J2.6 – Infinite scroll
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || isLoading || !hasMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 60) {
      onLoadMore();
    }
  }, [isLoading, hasMore, onLoadMore]);

  const handleClickItem = (n: Notification) => {
    if (!n.read) onMarkRead([n._id]);
    onClickNotification(n);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#021612]/80 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        className="relative flex w-[500px] max-w-full flex-col overflow-hidden rounded-3xl border border-[#1a5444] bg-[#051f19] shadow-[0_16px_60px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'revealUp 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#0d3228] px-5 py-4">
          <h3 className="font-ui-title text-lg text-[#e4fff5]">Trung tâm thông báo</h3>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="font-ui-content rounded-lg px-2.5 py-1.5 text-xs text-[#43e6b8] transition hover:bg-[#0d3228]"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
            <button
              type="button"
              onClick={onOpenSettings}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7cb3a1] transition hover:bg-[#0d3228] hover:text-[#cdece0]"
              aria-label="Cài đặt thông báo"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
                <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
                <path d="M12 4.5v2.1M12 17.4v2.1M4.5 12h2.1M17.4 12h2.1M6.8 6.8l1.5 1.5M15.7 15.7l1.5 1.5M17.2 6.8l-1.5 1.5M8.3 15.7l-1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#7cb3a1] transition hover:bg-[#0d3228] hover:text-[#ffb3b8]"
              aria-label="Đóng"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </div>

      {/* List */}
      <div ref={scrollRef} onScroll={handleScroll} className="max-h-[60vh] overflow-y-auto w-full">
        {notifications.length === 0 && !isLoading && (
          <div className="flex flex-col items-center gap-2 px-4 py-10">
            <span className="text-3xl opacity-40">🔔</span>
            <p className="font-ui-content text-sm text-[#6d9e8e]">Không có thông báo nào</p>
          </div>
        )}

        {notifications.map((n) => (
          <button
            key={n._id}
            type="button"
            onClick={() => handleClickItem(n)}
            className={`flex w-full items-start gap-3 border-b border-[#0a2e25] px-4 py-3 text-left transition hover:bg-[#0d3228]/60 ${
              !n.read ? 'bg-[#082a22]' : ''
            }`}
          >
            {/* Unread dot */}
            <div className="mt-1.5 flex-shrink-0">
              {!n.read ? (
                <span className="block h-2 w-2 rounded-full bg-[#30d7ab] shadow-[0_0_6px_rgba(48,215,171,0.5)]" />
              ) : (
                <span className="block h-2 w-2" />
              )}
            </div>

            {/* Icon */}
            <span className="mt-0.5 flex-shrink-0 text-lg leading-none">
              {TYPE_ICONS[n.type] ?? '🔔'}
            </span>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className={`font-ui-title text-[13px] leading-snug ${!n.read ? 'text-[#e4fff5]' : 'text-[#a3c7b9]'}`}>
                {n.title}
              </p>
              <p className="font-ui-content mt-0.5 truncate text-xs text-[#7cb3a1]">{n.body}</p>
              <p className="font-ui-content mt-1 text-[10px] text-[#4e8873]">{relativeTime(n.createdAt)}</p>
            </div>
          </button>
        ))}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-1 px-4 py-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 animate-pulse rounded-full bg-[#0d3228]" />
                <div className="h-5 w-5 animate-pulse rounded bg-[#0d3228]" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-[#0d3228]" />
                  <div className="h-2.5 w-1/2 animate-pulse rounded bg-[#0d3228]" />
                </div>
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
    </div>,
    document.body
  );
}
