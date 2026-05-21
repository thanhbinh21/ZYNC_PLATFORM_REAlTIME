'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { DASHBOARD_HOME_MOCK_DATA } from '@/components/home-dashboard/mock-data';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { NotificationHub } from '@/components/home-dashboard/organisms/NotificationHub';
import { GlobalCallListener } from '@/components/home-dashboard/organisms/GlobalCallListener';
import { ActiveCallOverlay } from '@/components/home-dashboard/organisms/ActiveCallOverlay';
import { MobileBottomNav } from '@/components/shared/MobileBottomNav';
import { PageLoading } from '@/components/shared/page-loading';
import { useLoginForm } from '@/hooks/use-login-form';
import { profileStore, subscribeToProfileStore } from '@/stores/profile-store';
import type { Notification } from '@/services/notifications';
import { MediaViewerProvider } from '@/context/media-viewer-context';
import { getAccessToken } from '@/utils/auth-token';
import { getSocket } from '@/services/socket';
import { useAiAssistant } from '@/hooks/use-ai-assistant';
import { AiAssistantBox } from '@/components/ai-assistant/ai-assistant-box';

type DashboardAppearanceSettings = {
  theme: 'dark' | 'light';
  messageFontSize: 'small' | 'medium' | 'large';
};

const DEFAULT_APPEARANCE_SETTINGS: DashboardAppearanceSettings = {
  theme: 'light',
  messageFontSize: 'medium',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { onLogout } = useLoginForm();

  const [appearanceSettings, setAppearanceSettings] = useState<DashboardAppearanceSettings>({
    theme: 'light',
    messageFontSize: 'medium',
  });

  // Profile state synced from module-level store
  const [profile, setProfile] = useState(profileStore.profile);
  const [isReady, setIsReady] = useState(profileStore.isReady);

  // Load appearance settings
  useEffect(() => {
    const savedTheme = globalThis.localStorage?.getItem('zync.dashboard.theme');
    const savedFontSize = globalThis.localStorage?.getItem('zync.dashboard.messageFontSize');

    const theme: DashboardAppearanceSettings['theme'] =
      savedTheme === 'dark'
        ? 'dark'
        : savedTheme === 'light' || savedTheme === 'verdant'
          ? 'light'
          : DEFAULT_APPEARANCE_SETTINGS.theme;

    const messageFontSize: DashboardAppearanceSettings['messageFontSize'] =
      savedFontSize === 'small' || savedFontSize === 'medium' || savedFontSize === 'large'
        ? savedFontSize
        : 'medium';

    setAppearanceSettings({ theme, messageFontSize });
  }, []);

  useEffect(() => {
    document.documentElement.dataset['zyncTheme'] = appearanceSettings.theme;
    document.documentElement.dataset['zyncMessageSize'] = appearanceSettings.messageFontSize;
  }, [appearanceSettings.messageFontSize, appearanceSettings.theme]);

  // Auth guard: load profile once via module store (persists across page navigations)
  useEffect(() => {
    if (profileStore.isReady || profileStore.isLoading) {
      setProfile(profileStore.profile);
      setIsReady(profileStore.isReady);
      return;
    }
    profileStore.load().then(() => {
      setProfile(profileStore.profile);
      setIsReady(profileStore.isReady);
      if (!profileStore.profile?.onboardingCompleted) {
        router.push('/onboarding');
      }
    });
  }, [router]);

  // Initialize socket at layout level (singleton) – chat page will re-use it.
  // Chỉ init khi profile đã ready để đảm bảo user đã đăng nhập.
  useEffect(() => {
    if (!isReady || !profileStore.profile) return;

    const token = getAccessToken();
    if (!token) return;

    try {
      getSocket(token);
    } catch {
      // Socket init sẽ throw nếu chưa login – ignore trong layout.
    }
  }, [isReady]);

  // Subscribe to store updates (e.g. after login from another tab)
  useEffect(() => {
    const unsub = subscribeToProfileStore((p, _loading, ready) => {
      setProfile(p);
      setIsReady(ready);
    });
    return unsub;
  }, []);

  const handleToggleTheme = () => {
    const newTheme: DashboardAppearanceSettings['theme'] = appearanceSettings.theme === 'dark' ? 'light' : 'dark';
    const newSettings = { ...appearanceSettings, theme: newTheme };
    setAppearanceSettings(newSettings);
    globalThis.localStorage?.setItem('zync.dashboard.theme', newTheme);
    globalThis.localStorage?.setItem('zync.dashboard.messageFontSize', newSettings.messageFontSize);
  };

  // ── AI Assistant Box ─────────────────────────────────────────────────────────
  const aiAssistant = useAiAssistant({ defaultLimit: 10 });

  const handleUseSuggestedReply = useCallback((conversationId: string, reply: string) => {
    if (typeof window !== 'undefined') {
      const storageKey = `zync.chatDraft.${conversationId}`;
      window.sessionStorage.setItem(storageKey, reply);
      window.dispatchEvent(new CustomEvent('zync:chat-draft', {
        detail: { conversationId, draft: reply },
      }));
    }

    router.push(`/chat?conversationId=${conversationId}`);
    aiAssistant.closeBox();
  }, [aiAssistant, router]);

  // Determine active nav from pathname
  const getActiveNavId = (): string => {
    if (pathname.startsWith('/chat')) return 'chat';
    if (pathname.startsWith('/friends')) return 'friends';
    if (pathname.startsWith('/community')) return 'community';
    if (pathname.startsWith('/explore')) return 'explore';
    if (pathname.startsWith('/settings')) return 'settings';
    return 'home';
  };

  const activeNavId = getActiveNavId();

  const handleNotificationNavigate = (notification: Notification) => {
    const action = notification.data?.action;
    const conversationId = notification.conversationId ?? notification.data?.conversationId;
    const storyId = notification.data?.storyId;

    if (action === 'group_deleted' || action === 'group_removed') {
      router.push('/home');
      return;
    }

    if (action === 'open_chat') {
      router.push(conversationId ? `/chat?conversationId=${conversationId}` : '/chat');
      return;
    }

    if (action === 'open_friend_requests') {
      router.push('/friends#requests');
      return;
    }

    if (action === 'open_story') {
      router.push(storyId ? `/profile?tab=stories&storyId=${encodeURIComponent(storyId)}` : '/profile?tab=stories');
      return;
    }

    if (notification.type === 'new_message' || notification.type === 'group_invite' || notification.type === 'group_update') {
      router.push(conversationId ? `/chat?conversationId=${conversationId}` : '/chat');
      return;
    }

    if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
      router.push('/friends#requests');
      return;
    }

    if (notification.type === 'story_reaction' || notification.type === 'story_reply') {
      router.push('/profile?tab=stories');
      return;
    }

    if (
      notification.type === 'community_post' ||
      notification.data?.action === 'open_community'
    ) {
      const postId = notification.data?.postId;
      router.push(postId ? `/community?post=${encodeURIComponent(postId)}` : '/community');
      return;
    }

    if (
      notification.type === 'post_like' ||
      notification.type === 'post_comment' ||
      notification.type === 'post_bookmark'
    ) {
      const postId = notification.data?.postId;
      router.push(postId ? `/community?post=${encodeURIComponent(postId)}` : '/community');
      return;
    }

    router.push('/home');
  };

  // Update mock data user info from profile
  const headerData = {
    ...DASHBOARD_HOME_MOCK_DATA,
    user: profile
      ? {
          displayName: profile.displayName,
          roleLabel: 'Đang hoạt động',
          initials: profile.displayName.slice(0, 2).toUpperCase(),
          avatarUrl: profile.avatarUrl,
        }
      : DASHBOARD_HOME_MOCK_DATA.user,
  };

  return (
    <MediaViewerProvider>
      <main className="zync-page-shell zync-dashboard-main flex h-[100dvh] flex-col overflow-hidden text-text-primary">
        <Suspense fallback={<PageLoading mode="panel" />}>
          <DashboardHeader
            data={headerData}
            activeNavId={activeNavId}
            theme={appearanceSettings.theme}
            onToggleTheme={handleToggleTheme}
            notificationSlot={<NotificationHub onNavigate={handleNotificationNavigate} />}
            aiAssistantSlot={
              <button
                type="button"
                onClick={aiAssistant.openBox}
                className="zync-soft-badge relative hidden md:flex h-10 w-10 items-center justify-center p-0 text-accent hover:bg-accent/10"
                title="Zync AI Assistant"
                aria-label="Mở AI Assistant"
              >
                <Sparkles className="h-5 w-5" />
                {aiAssistant.unreadDigestCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {aiAssistant.unreadDigestCount > 9 ? '9+' : aiAssistant.unreadDigestCount}
                  </span>
                )}
              </button>
            }
            onNavSelect={(id) => {
              if (id === 'logout') onLogout();
            }}
          />
        </Suspense>

        <div className="flex-1 overflow-hidden px-2 pb-[76px] md:pb-2 sm:px-4 sm:pb-4">
          <div className="flex h-full flex-1 flex-col overflow-hidden rounded-[2rem] bg-[var(--surface-card)]">
            {children}
          </div>
        </div>

        <MobileBottomNav navItems={headerData.navItems} activeNavId={activeNavId} />

        {/* Export settings functions for child pages via window */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__zyncDashboardSettings = {
                getSettings: function() { return JSON.parse(localStorage.getItem('zync.dashboard.theme') ? '{"theme":"' + localStorage.getItem('zync.dashboard.theme') + '","messageFontSize":"' + (localStorage.getItem('zync.dashboard.messageFontSize') || 'medium') + '"}' : '{"theme":"light","messageFontSize":"medium"}'); },
                applyAppearance: function(s) {
                  document.documentElement.dataset['zyncTheme'] = s.theme;
                  document.documentElement.dataset['zyncMessageSize'] = s.messageFontSize;
                },
                saveSettings: function(s) {
                  localStorage.setItem('zync.dashboard.theme', s.theme);
                  localStorage.setItem('zync.dashboard.messageFontSize', s.messageFontSize);
                }
              };
            `,
          }}
        />
        <GlobalCallListener />
        <ActiveCallOverlay />

        {/* AI Assistant Box */}
        <div className="hidden md:block">
          <AiAssistantBox
            isOpen={aiAssistant.isOpen}
            activeTab={aiAssistant.activeTab}
            conversations={aiAssistant.conversations}
            catchupDetailsByConversationId={aiAssistant.catchupDetailsByConversationId}
            tasks={aiAssistant.tasks}
            taskTotal={aiAssistant.taskTotal}
            items={aiAssistant.items}
            total={aiAssistant.total}
            loadingList={aiAssistant.loadingList}
            loadingTasks={aiAssistant.loadingTasks}
            loadingItems={aiAssistant.loadingItems}
            pendingTaskCount={aiAssistant.pendingTaskCount}
            onClose={aiAssistant.closeBox}
            onTabChange={aiAssistant.setActiveTab}
            onSummarize={aiAssistant.createDigest}
            onRegenerate={aiAssistant.regenerate}
            onCreateTask={aiAssistant.createTaskFromActionItem}
            onAcceptTask={aiAssistant.acceptTask}
            onCompleteTask={aiAssistant.completeTask}
            onDismissTask={aiAssistant.dismissTask}
            onUseSuggestedReply={handleUseSuggestedReply}
            onOpenChat={(conversationId) => {
              router.push(`/chat?conversationId=${conversationId}`);
            }}
            onLoadMore={aiAssistant.loadItems}
            onLoadMoreTasks={() => aiAssistant.loadTasks(false)}
          />
        </div>
      </main>
    </MediaViewerProvider>
  );
}
