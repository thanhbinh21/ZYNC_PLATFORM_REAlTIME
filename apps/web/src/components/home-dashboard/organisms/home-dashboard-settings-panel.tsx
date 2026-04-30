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

  useEffect(() => {
    const saved = globalThis.localStorage?.getItem('zync.dashboard.settings');
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as {
        showOnlineStatus?: boolean;
        allowFriendRequests?: boolean;
        emailNotifications?: boolean;
        desktopNotifications?: boolean;
        soundEnabled?: boolean;
        readReceipts?: boolean;
      };
      setShowOnlineStatus(parsed.showOnlineStatus ?? true);
      setAllowFriendRequests(parsed.allowFriendRequests ?? true);
      setEmailNotifications(parsed.emailNotifications ?? false);
      setDesktopNotifications(parsed.desktopNotifications ?? true);
      setSoundEnabled(parsed.soundEnabled ?? true);
      setReadReceipts(parsed.readReceipts ?? true);
    } catch {
      // ignore invalid local storage payload
    }
  }, []);

  useEffect(() => {
    globalThis.localStorage?.setItem(
      'zync.dashboard.settings',
      JSON.stringify({
        showOnlineStatus,
        allowFriendRequests,
        emailNotifications,
        desktopNotifications,
        soundEnabled,
        readReceipts,
      }),
    );
  }, [
    allowFriendRequests,
    desktopNotifications,
    emailNotifications,
    readReceipts,
    showOnlineStatus,
    soundEnabled,
  ]);

  const summary = useMemo(() => {
    const enabled = [
      showOnlineStatus,
      allowFriendRequests,
      emailNotifications,
      desktopNotifications,
      soundEnabled,
      readReceipts,
    ].filter(Boolean).length;
    return `${enabled}/6 tùy chọn đang bật`;
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
        <p className="font-ui-meta text-xs uppercase tracking-wider text-accent-strong">Trung tâm điều khiển</p>
        <h2 className="font-ui-title mt-2 text-2xl text-text-primary">Cài đặt tài khoản</h2>
          <p className="font-ui-content mt-2 max-w-2xl text-sm leading-7 text-text-secondary">
          Đồng bộ theme, độ dễ đọc và các toggle quan trọng theo một bộ token chung cho light và dark mode.
        </p>
        <p className="font-ui-title mt-4 text-sm text-text-primary">{summary}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="zync-soft-card rounded-[1.8rem] p-4 sm:p-5">
          <h3 className="font-ui-title text-lg text-text-primary">Quyền riêng tư</h3>

          <div className="mt-4 space-y-3">
            <SettingSwitch
              label="Hiển thị trạng thái hoạt động"
              description="Cho phép bạn bè nhìn thấy khi bạn đang online."
              checked={showOnlineStatus}
              onChange={setShowOnlineStatus}
            />

            <SettingSwitch
              label="Cho phép nhận lời mời kết bạn"
              description="Người dùng khác có thể gửi lời mời kết bạn đến bạn."
              checked={allowFriendRequests}
              onChange={setAllowFriendRequests}
            />

            <SettingSwitch
              label="Hiển thị đã xem"
              description="Cho phép người khác thấy bạn đã đọc tin nhắn của họ."
              checked={readReceipts}
              onChange={setReadReceipts}
            />
          </div>
        </section>

        <section className="zync-soft-card rounded-[1.8rem] p-4 sm:p-5">
          <h3 className="font-ui-title text-lg text-text-primary">Thông báo</h3>

          <div className="mt-4 space-y-3">
            <SettingSwitch
              label="Thông báo trên desktop"
              description="Hiển thị popup thông báo cho tin nhắn mới trên trình duyệt."
              checked={desktopNotifications}
              onChange={setDesktopNotifications}
            />

            <SettingSwitch
              label="Thông báo qua email"
              description="Nhận email tổng hợp hoạt động quan trọng mỗi ngày."
              checked={emailNotifications}
              onChange={setEmailNotifications}
            />

            <SettingSwitch
              label="Âm thanh tin nhắn"
              description="Phát âm thanh khi có tin nhắn mới hoặc nhắc nhở."
              checked={soundEnabled}
              onChange={setSoundEnabled}
            />
          </div>
        </section>
      </div>

      <section className="zync-soft-card rounded-[1.8rem] p-4 sm:p-5">
        <h3 className="font-ui-title text-lg text-text-primary">Giao diện hiển thị</h3>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="font-ui-meta text-[0.68rem] uppercase tracking-[0.12em] text-text-secondary">Chế độ giao diện</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: 'light', label: 'Sáng' },
                { id: 'dark', label: 'Tối' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    const nextTheme = item.id as DashboardThemeMode;
                    setTheme(nextTheme);
                    onApplyAppearance({ theme: nextTheme, messageFontSize });
                  }}
                  className={`zync-soft-step ${theme === item.id ? 'zync-soft-step-active' : ''}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-ui-meta text-[0.68rem] uppercase tracking-[0.12em] text-text-secondary">Cỡ chữ tin nhắn</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: 'small', label: 'Nhỏ' },
                { id: 'medium', label: 'Vừa' },
                { id: 'large', label: 'Lớn' },
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
            Khôi phục mặc định
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyAppearance({ theme, messageFontSize });
            }}
            className="zync-soft-button px-4 py-2.5 text-sm"
          >
            Lưu thay đổi
          </button>
        </div>
      </section>
    </section>
  );
}
