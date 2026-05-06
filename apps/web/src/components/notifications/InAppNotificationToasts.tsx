'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSocket } from '@/services/socket';
import { getAccessToken } from '@/utils/auth-token';
import type { Notification } from '@/services/notifications';
import { markAsRead } from '@/services/notifications';
import { MessageCircle, UserPlus, UserCheck, Users, Heart, MessageSquare, Bell } from 'lucide-react';

type ToastItem = {
  id: string;
  notification: Notification;
  createdAt: number;
};

const MAX_TOASTS = 2;
const AUTO_DISMISS_MS = 5500;
const SUMMARY_ID = 'toast-summary';

function IconForType({ type, isSummary }: { type?: Notification['type'], isSummary?: boolean }) {
  if (isSummary) return <Bell className="h-5 w-5 text-accent" />;
  switch (type) {
    case 'new_message': return <MessageCircle className="h-5 w-5 text-blue-400" />;
    case 'friend_request': return <UserPlus className="h-5 w-5 text-amber-400" />;
    case 'friend_accepted': return <UserCheck className="h-5 w-5 text-emerald-400" />;
    case 'group_invite': return <Users className="h-5 w-5 text-indigo-400" />;
    case 'story_reaction': return <Heart className="h-5 w-5 text-rose-400" />;
    case 'story_reply': return <MessageSquare className="h-5 w-5 text-purple-400" />;
    default: return <Bell className="h-5 w-5 text-text-secondary" />;
  }
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function InAppNotificationToasts() {
  const router = useRouter();
  const pathname = usePathname();
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const overflowCountRef = useRef<number>(0);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const scheduleDismiss = useCallback(
    (id: string) => {
      const existing = timersRef.current.get(id);
      if (existing) clearTimeout(existing);
      const t = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timersRef.current.set(id, t);
    },
    [dismiss],
  );

  const navigateFrom = useCallback(
    async (n: Notification) => {
      try {
        if (!n.read) {
          await markAsRead([n._id]);
        }
      } catch {
        // silent
      }

      if (n.type === 'friend_request' || n.type === 'friend_accepted') {
        router.push('/friends');
        return;
      }

      if (n.conversationId) {
        router.push(`/chat?conversationId=${encodeURIComponent(n.conversationId)}`);
      } else {
        router.push('/home');
      }
    },
    [router],
  );

  const openNotificationsFromSummary = useCallback(() => {
    router.push('/home?openNotifications=1');
  }, [router]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = getSocket(token);

    const handler = (notification: Notification) => {
      // Avoid duplicate UX when user is currently in Chat view
      if (pathname?.startsWith('/chat') && notification.type === 'new_message') {
        return;
      }

      const now = Date.now();
      const id = `toast-${notification._id}-${now}-${Math.random().toString(36).slice(2, 6)}`;

      setItems((prev) => {
        const withoutSummary = prev.filter((t) => t.id !== SUMMARY_ID);

        if (withoutSummary.length < 2) {
          overflowCountRef.current = 0;
          return [{ id, notification, createdAt: now }, ...withoutSummary].slice(0, MAX_TOASTS);
        }

        overflowCountRef.current += 1;
        const summaryNotification: Notification = {
          _id: SUMMARY_ID,
          userId: '',
          type: 'new_message',
          title: `${overflowCountRef.current + 1} thông báo mới`,
          body: 'Nhấn để xem danh sách thông báo',
          read: true,
          createdAt: new Date(now).toISOString(),
        };

        return [
          { id, notification, createdAt: now },
          { id: SUMMARY_ID, notification: summaryNotification, createdAt: now },
        ];
      });

      scheduleDismiss(id);
      scheduleDismiss(SUMMARY_ID);
    };

    socket.on('new_notification', handler);
    return () => {
      socket.off('new_notification', handler);
    };
  }, [pathname, scheduleDismiss]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []);

  const rendered = useMemo(() => {
    return items.map((t) => {
      const isSummary = t.id === SUMMARY_ID;
      const label = timeLabel(t.createdAt);
      return (
        <div
          key={t.id}
          className="pointer-events-auto w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[#1a5c4a]/70 bg-[#062a21]/90 shadow-[0_16px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
          style={{ animation: 'toastDrop 0.18s ease-out' }}
        >
          <button
            type="button"
            onClick={() => {
              if (isSummary) {
                overflowCountRef.current = 0;
                setItems([]);
                openNotificationsFromSummary();
                return;
              }
              void navigateFrom(t.notification);
              dismiss(t.id);
            }}
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#0d3228]/55"
          >
            <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-[#1a5c4a]/60 bg-[#0a3b2f]/70 text-base">
              <IconForType type={t.notification.type} isSummary={isSummary} />
            </div>

            <div className="min-w-0 flex-1 pr-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-ui-title truncate text-sm text-[#e4fff5]">{t.notification.title}</p>
                <span className="font-ui-content flex-shrink-0 text-[10px] text-[#6db39e]">{label}</span>
              </div>
              <p className={`font-ui-content mt-1 ${isSummary ? 'line-clamp-1' : 'line-clamp-2'} text-xs text-[#a8d8c7]`}>
                {t.notification.body}
              </p>
            </div>

            <span
              role="button"
              aria-label="Đóng"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismiss(t.id);
              }}
              className="mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-[#7cb3a1] hover:bg-[#0d3228]"
            >
              ✕
            </span>
          </button>
        </div>
      );
    });
  }, [dismiss, items, navigateFrom, openNotificationsFromSummary]);

  if (items.length === 0) return null;

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-4 z-[110] flex flex-col items-center gap-2 px-4">
      {rendered}
      <style jsx>{`
        @keyframes toastDrop {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

