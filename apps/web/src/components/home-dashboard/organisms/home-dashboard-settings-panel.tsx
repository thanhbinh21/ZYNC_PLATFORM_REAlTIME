'use client';

import { useEffect, useMemo, useState } from 'react';

export type DashboardThemeMode = 'dark' | 'light';
export type DashboardMessageFontSize = 'small' | 'medium' | 'large';

export interface DashboardAppearanceSettings {
  theme: DashboardThemeMode;
  messageFontSize: DashboardMessageFontSize;
}

interface SettingSwitchProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}

function SettingSwitch({ label, description, checked, onChange }: SettingSwitchProps) {
  return (
    <div className="zync-soft-card-muted flex items-start justify-between gap-4 rounded-[1.2rem] p-4">
      <div>
        <p className="font-ui-title text-sm text-text-primary">{label}</p>
        <p className="font-ui-content mt-1 text-xs leading-6 text-text-secondary">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </div>
  );
}

interface HomeDashboardSettingsPanelProps {
  appearance: DashboardAppearanceSettings;
  onApplyAppearance: (settings: DashboardAppearanceSettings) => void;
  onResetAppearance: () => void;
}

export function HomeDashboardSettingsPanel({
  appearance,
  onApplyAppearance,
  onResetAppearance,
}: HomeDashboardSettingsPanelProps) {
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowFriendRequests, setAllowFriendRequests] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [desktopNotifications, setDesktopNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [theme, setTheme] = useState<DashboardThemeMode>(appearance.theme);
  const [messageFontSize, setMessageFontSize] = useState<DashboardMessageFontSize>(appearance.messageFontSize);

  useEffect(() => {
    setTheme(appearance.theme);
    setMessageFontSize(appearance.messageFontSize);
  }, [appearance.messageFontSize, appearance.theme]);

  const summary = useMemo(() => {
    const enabled = [
      showOnlineStatus,
      allowFriendRequests,
      emailNotifications,
      desktopNotifications,
      soundEnabled,
      readReceipts,
    ].filter(Boolean).length;
    return `${enabled}/6 tuy chon dang bat`;
  }, [
    allowFriendRequests,
    desktopNotifications,
    emailNotifications,
    readReceipts,
    showOnlineStatus,
    soundEnabled,
  ]);

  return (
    <section className="mt-5 space-y-5">
      <header className="zync-soft-card rounded-[1.8rem] px-5 py-5">
        <p className="font-ui-meta text-xs uppercase tracking-wider text-accent-strong">Control center</p>
        <h2 className="font-ui-title mt-2 text-2xl text-text-primary">Cai dat tai khoan</h2>
        <p className="font-ui-content mt-2 max-w-2xl text-sm leading-7 text-text-secondary">
          Dong bo theme, readability va cac toggle quan trong theo mot bo token chung cho light va dark mode.
        </p>
        <p className="font-ui-title mt-4 text-sm text-text-primary">{summary}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="zync-soft-card rounded-[1.8rem] p-4 sm:p-5">
          <h3 className="font-ui-title text-lg text-text-primary">Quyen rieng tu</h3>

          <div className="mt-4 space-y-3">
            <SettingSwitch
              label="Hien thi trang thai hoat dong"
              description="Cho phep ban be nhin thay khi ban dang online."
              checked={showOnlineStatus}
              onChange={setShowOnlineStatus}
            />

            <SettingSwitch
              label="Cho phep nhan loi moi ket ban"
              description="Nguoi dung khac co the gui loi moi ket ban den ban."
              checked={allowFriendRequests}
              onChange={setAllowFriendRequests}
            />

            <SettingSwitch
              label="Hien thi da xem"
              description="Cho phep nguoi khac thay ban da doc tin nhan cua ho."
              checked={readReceipts}
              onChange={setReadReceipts}
            />
          </div>
        </section>

        <section className="zync-soft-card rounded-[1.8rem] p-4 sm:p-5">
          <h3 className="font-ui-title text-lg text-text-primary">Thong bao</h3>

          <div className="mt-4 space-y-3">
            <SettingSwitch
              label="Thong bao tren desktop"
              description="Hien thi popup thong bao cho tin nhan moi tren trinh duyet."
              checked={desktopNotifications}
              onChange={setDesktopNotifications}
            />

            <SettingSwitch
              label="Thong bao qua email"
              description="Nhan email tong hop hoat dong quan trong moi ngay."
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />

            <SettingSwitch
              label="Am thanh tin nhan"
              description="Phat am thanh khi co tin nhan moi hoac nhac nho."
              checked={soundEnabled}
              onChange={setSoundEnabled}
            />
          </div>
        </section>
      </div>

      <section className="zync-soft-card rounded-[1.8rem] p-4 sm:p-5">
        <h3 className="font-ui-title text-lg text-text-primary">Giao dien hien thi</h3>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="font-ui-meta text-[0.68rem] uppercase tracking-[0.12em] text-text-secondary">Theme mode</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: 'light', label: 'Light mode' },
                { id: 'dark', label: 'Dark mode' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id as DashboardThemeMode)}
                  className={`zync-soft-step ${theme === item.id ? 'zync-soft-step-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-ui-meta text-[0.68rem] uppercase tracking-[0.12em] text-text-secondary">Co chu tin nhan</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: 'small', label: 'Nho' },
                { id: 'medium', label: 'Vua' },
                { id: 'large', label: 'Lon' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMessageFontSize(item.id as DashboardMessageFontSize)}
                  className={`zync-soft-step ${messageFontSize === item.id ? 'zync-soft-step-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              onResetAppearance();
            }}
            className="zync-soft-button-ghost px-4 py-2.5 text-sm"
          >
            Khoi phuc mac dinh
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyAppearance({ theme, messageFontSize });
            }}
            className="zync-soft-button px-4 py-2.5 text-sm"
          >
            Luu thay doi
          </button>
        </div>
      </section>
    </section>
  );
}
