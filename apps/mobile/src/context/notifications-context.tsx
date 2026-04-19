import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { NotificationsSheet } from '../components/NotificationsSheet';
import { useNotifications } from '../hooks/useNotifications';
import type { NotificationAnchorRect } from '../services/notifications';
import { useAuthStore } from '../store/useAuthStore';

export type { NotificationAnchorRect };

type NotificationsContextValue = ReturnType<typeof useNotifications> & {
  sheetVisible: boolean;
  openNotificationSheet: (anchor?: NotificationAnchorRect | null) => void;
  closeNotificationSheet: () => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const notificationsApi = useNotifications(isAuthenticated);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [anchorRect, setAnchorRect] = useState<NotificationAnchorRect | null>(null);

  const openNotificationSheet = useCallback(
    (anchor?: NotificationAnchorRect | null) => {
      setAnchorRect(anchor ?? null);
      setSheetVisible(true);
      void notificationsApi.loadNotifications();
    },
    [notificationsApi],
  );

  const closeNotificationSheet = useCallback(() => {
    setSheetVisible(false);
    setAnchorRect(null);
  }, []);

  const value = useMemo(
    () => ({
      ...notificationsApi,
      sheetVisible,
      openNotificationSheet,
      closeNotificationSheet,
    }),
    [notificationsApi, sheetVisible, openNotificationSheet, closeNotificationSheet],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <NotificationsSheet
        visible={sheetVisible}
        anchorRect={anchorRect}
        onClose={closeNotificationSheet}
        notifications={notificationsApi.notifications}
        isLoading={notificationsApi.isLoading}
        hasMore={notificationsApi.hasMore}
        onLoadMore={notificationsApi.loadMore}
        onMarkRead={notificationsApi.markRead}
        onMarkAllRead={notificationsApi.markAllRead}
      />
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotificationsContext must be used within NotificationsProvider');
  }
  return ctx;
}
