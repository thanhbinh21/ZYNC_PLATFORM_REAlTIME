'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/services/socket';
import { getAccessToken } from '@/utils/auth-token';
import type { Notification } from '@/services/notifications';
import { markAsRead } from '@/services/notifications';
import { MessageCircle, UserPlus, UserCheck, Users, Heart, MessageSquare, Bell } from 'lucide-react';
import { ACCOUNT_SETTINGS_EVENT, loadCachedAccountSettings, type AccountSettings } from '@/services/account-settings';

type ToastItem = {
  id: string;
  notification: Notification;
  createdAt: number;
  actions?: Array<{
    label: string;
    variant?: 'primary' | 'danger' | 'secondary';
    onClick: () => void;
  }>;
};

const MAX_TOASTS = 2;
const AUTO_DISMISS_MS = 5500;
const SUMMARY_ID = 'toast-summary';
export const WEB_IN_APP_TOAST_EVENT = 'zync:web-in-app-toast';

export type WebInAppToastDetail = {
  id?: string;
  type?: Notification['type'];
  title: string;
  body: string;
  durationMs?: number;
  dismiss?: boolean;
  onPress?: () => void;
  actions?: ToastItem['actions'];
};

function IconForType({ type, isSummary }: { type?: Notification['type'], isSummary?: boolean }) {
  if (isSummary) return <Bell className="h-5 w-5 text-accent" />;
  switch (type) {
    case 'new_message': return <MessageCircle className="h-5 w-5 text-blue-400" />;
    case 'friend_request': return <UserPlus className="h-5 w-5 text-amber-400" />;
    case 'friend_accepted': return <UserCheck className="h-5 w-5 text-emerald-400" />;
    case 'group_invite': return <Users className="h-5 w-5 text-indigo-400" />;
    case 'story_reaction': return <Heart className="h-5 w-5 text-rose-400" />;
    case 'story_reply': return <MessageSquare className="h-5 w-5 text-purple-400" />;
    case 'post_like': return <Heart className="h-5 w-5 text-rose-400" />;
    case 'post_comment': return <MessageSquare className="h-5 w-5 text-purple-400" />;
    case 'post_bookmark': return <MessageSquare className="h-5 w-5 text-amber-400" />;
    case 'community_post': return <Bell className="h-5 w-5 text-accent" />;
    default: return <Bell className="h-5 w-5 text-text-secondary" />;
  }
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function InAppNotificationToasts() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const overflowCountRef = useRef<number>(0);
  const toastEnabledRef = useRef<boolean>(true);

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

      const data = n.data as Record<string, string> | undefined;
      if (data?.action === 'open_community' && data?.postId) {
        router.push(`/community?postId=${encodeURIComponent(data.postId)}`);
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
    setMounted(true);
  }, []);

  useEffect(() => {
    toastEnabledRef.current = loadCachedAccountSettings().toastNotifications;

    const handleSettingsUpdate = (event: Event) => {
      const detail = (event as CustomEvent<AccountSettings>).detail;
      if (detail) {
        toastEnabledRef.current = detail.toastNotifications;
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener(ACCOUNT_SETTINGS_EVENT, handleSettingsUpdate);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(ACCOUNT_SETTINGS_EVENT, handleSettingsUpdate);
      }
    };
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = getSocket(token);

    const handler = (notification: Notification) => {
      if (!toastEnabledRef.current) {
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
  }, [scheduleDismiss]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<WebInAppToastDetail>).detail;
      if (!detail?.id) return;
      if (detail.dismiss) {
        dismiss(detail.id);
        return;
      }
      if (!detail.title) return;

      const now = Date.now();
      const id = detail.id;
      const notification: Notification = {
        _id: id,
        userId: '',
        type: detail.type ?? 'community_post',
        title: detail.title,
        body: detail.body,
        read: true,
        createdAt: new Date(now).toISOString(),
      };

      setItems((prev) => [{ id, notification, createdAt: now, actions: detail.actions }, ...prev.filter((t) => t.id !== id)].slice(0, MAX_TOASTS));
      const t = setTimeout(() => dismiss(id), detail.durationMs ?? AUTO_DISMISS_MS);
      timersRef.current.set(id, t);
    };

    window.addEventListener(WEB_IN_APP_TOAST_EVENT, handler);
    return () => window.removeEventListener(WEB_IN_APP_TOAST_EVENT, handler);
  }, [dismiss]);

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
              if (t.actions?.length) return;
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
              {t.actions && t.actions.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {t.actions.map((action) => (
                    <span
                      key={action.label}
                      role="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        action.onClick();
                        dismiss(t.id);
                      }}
                      className={`inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-white ${
                        action.variant === 'danger'
                          ? 'bg-red-500 hover:bg-red-600'
                          : action.variant === 'secondary'
                            ? 'bg-[#194437] hover:bg-[#215443]'
                            : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {action.label}
                    </span>
                  ))}
                </div>
              )}
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

  if (!mounted || items.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 left-0 right-0 z-[9999] flex flex-col-reverse items-center gap-2 px-4">
      {rendered}
      <style jsx>{`
        @keyframes toastDrop {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body,
  );
}

