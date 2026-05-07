'use client';

import { useEffect, useState } from 'react';
import { HomeDashboardSettingsPanel } from '@/components/home-dashboard/organisms/home-dashboard-settings-panel';
import type { DashboardAppearanceSettings } from '@/components/home-dashboard/organisms/home-dashboard-settings-panel';

const DEFAULT_APPEARANCE: DashboardAppearanceSettings = {
  theme: 'light',
  messageFontSize: 'medium',
};

function loadAppearanceSettings(): DashboardAppearanceSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_APPEARANCE;
  }

  const savedTheme = window.localStorage.getItem('zync.dashboard.theme');
  const savedFontSize = window.localStorage.getItem('zync.dashboard.messageFontSize');

  const theme = savedTheme === 'dark' ? 'dark' : 'light';
  const messageFontSize =
    savedFontSize === 'small' || savedFontSize === 'medium' || savedFontSize === 'large'
      ? savedFontSize
      : 'medium';

  return { theme, messageFontSize };
}

export default function SettingsPage() {
  const [appearance, setAppearance] = useState<DashboardAppearanceSettings>(DEFAULT_APPEARANCE);

  useEffect(() => {
    setAppearance(loadAppearanceSettings());
  }, []);

  const applyAppearance = (settings: DashboardAppearanceSettings) => {
    setAppearance(settings);
    if (typeof window === 'undefined') return;

    document.documentElement.dataset['zyncTheme'] = settings.theme;
    document.documentElement.dataset['zyncMessageSize'] = settings.messageFontSize;
    window.localStorage.setItem('zync.dashboard.theme', settings.theme);
    window.localStorage.setItem('zync.dashboard.messageFontSize', settings.messageFontSize);
  };

  const resetAppearance = () => {
    applyAppearance(DEFAULT_APPEARANCE);
  };

  return (
    <div className="h-full w-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <HomeDashboardSettingsPanel
        appearance={appearance}
        onApplyAppearance={applyAppearance}
        onResetAppearance={resetAppearance}
      />
    </div>
  );
}
