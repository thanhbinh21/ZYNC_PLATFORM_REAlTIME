'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { DASHBOARD_HOME_MOCK_DATA } from '@/components/home-dashboard/mock-data';
import { DashboardHeader } from '@/components/shared/DashboardHeader';
import { NotificationHub } from '@/components/home-dashboard/organisms/NotificationHub';
import { PageLoading } from '@/components/shared/page-loading';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useLoginForm } from '@/hooks/use-login-form';
import { profileStore, subscribeToProfileStore } from '@/stores/profile-store';
import type { DashboardAppearanceSettings } from '@/components/home-dashboard/organisms/home-dashboard-settings-panel';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId } = useHomeDashboard();
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

    const theme =
      savedTheme === 'dark'
        ? 'dark'
        : savedTheme === 'light' || savedTheme === 'verdant'
          ? 'light'
          : DEFAULT_APPEARANCE_SETTINGS.theme;

    const messageFontSize =
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
    if (!userId) return;
    if (profileStore.isReady || profileStore.isLoading) {
      // Store already initialized; sync state
      setProfile(profileStore.profile);
      setIsReady(profileStore.isReady);
      return;
    }
    // First load
    profileStore.load().then(() => {
      setProfile(profileStore.profile);
      setIsReady(profileStore.isReady);
      if (!profileStore.profile?.onboardingCompleted) {
        router.push('/onboarding');
      }
    });
  }, [userId, router]);

  // Subscribe to store updates (e.g. after login from another tab)
  useEffect(() => {
    const unsub = subscribeToProfileStore((p, _loading, ready) => {
      setProfile(p);
      setIsReady(ready);
    });
    return unsub;
  }, []);

  const handleToggleTheme = () => {
    const newTheme = appearanceSettings.theme === 'dark' ? 'light' : 'dark';
    const newSettings = { ...appearanceSettings, theme: newTheme };
    setAppearanceSettings(newSettings);
    globalThis.localStorage?.setItem('zync.dashboard.theme', newTheme);
    globalThis.localStorage?.setItem('zync.dashboard.messageFontSize', newSettings.messageFontSize);
  };

  const handleApplyAppearance = (settings: DashboardAppearanceSettings) => {
    setAppearanceSettings(settings);
    globalThis.localStorage?.setItem('zync.dashboard.theme', settings.theme);
    globalThis.localStorage?.setItem('zync.dashboard.messageFontSize', settings.messageFontSize);
  };

  const handleResetAppearance = () => {
    const defaults = { theme: 'light' as const, messageFontSize: 'medium' as const };
    setAppearanceSettings(defaults);
    globalThis.localStorage?.setItem('zync.dashboard.theme', 'light');
    globalThis.localStorage?.setItem('zync.dashboard.messageFontSize', 'medium');
  };

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
    <main className="zync-page-shell zync-dashboard-main flex h-[100dvh] flex-col overflow-hidden text-text-primary">
      <Suspense fallback={<PageLoading />}>
        <DashboardHeader
          data={headerData}
          activeNavId={activeNavId}
          theme={appearanceSettings.theme}
          onToggleTheme={handleToggleTheme}
          onNavSelect={(id) => {
            if (id === 'logout') onLogout();
          }}
        />
      </Suspense>

      <div className="flex-1 overflow-hidden px-2 pb-2 sm:px-4 sm:pb-4">
        <section className="zync-soft-card zync-soft-card-elevated flex h-full flex-1 flex-col overflow-hidden rounded-[2rem]">
          {children}
        </section>
      </div>

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
    </main>
  );
}
