'use client';

import { useEffect, useMemo, useState } from 'react';

export type DashboardThemeMode = 'verdant' | 'dark' | 'light';
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
    <div className="flex items-start justify-between gap-4 rounded-2xl border border-[#15483b] bg-[#07241d]/80 p-4">
      <div>
        <p className="font-ui-title text-[0.98rem] text-[#e2fff4]">{label}</p>
        <p className="font-ui-content mt-1 text-sm text-[#9dc8ba]">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 rounded-full transition ${checked ? 'bg-[#34dfb5]' : 'bg-[#295246]'}`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${checked ? 'left-6' : 'left-1'}`}
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
    return `${enabled}/6 tuỳ chọn đang bật`;
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
      <header className="rounded-3xl border border-[#12473a] bg-[linear-gradient(145deg,#0a3127_0%,#07221c_100%)] px-5 py-5">
        <p className="font-ui-meta text-xs uppercase tracking-[0.16em] text-[#6db8a2]">Trung tâm thiết lập</p>
        <h2 className="font-ui-title mt-2 text-[clamp(1.35rem,2.5vw,2.1rem)] text-[#e5fff5]">Cài đặt tài khoản</h2>
        <p className="font-ui-content mt-2 text-sm text-[#aad5c6]">
          Tuỳ chỉnh quyền riêng tư, thông báo và giao diện để tối ưu trải nghiệm ZYNC theo phong cách của bạn.
        </p>
        <p className="font-ui-content mt-3 text-sm text-[#4de5b8]">{summary}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-3xl border border-[#103f33] bg-[#051f19]/70 p-4 sm:p-5">
          <h3 className="font-ui-title text-lg text-[#defcef]">Quyền riêng tư</h3>

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
        </section>

        <section className="space-y-3 rounded-3xl border border-[#103f33] bg-[#051f19]/70 p-4 sm:p-5">
          <h3 className="font-ui-title text-lg text-[#defcef]">Thông báo</h3>

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
        </section>
      </div>

      <section className="rounded-3xl border border-[#103f33] bg-[#051f19]/70 p-4 sm:p-5">
        <h3 className="font-ui-title text-lg text-[#defcef]">Giao diện hiển thị</h3>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="font-ui-meta text-[0.68rem] uppercase tracking-[0.12em] text-[#79b6a2]">Bảng màu</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { id: 'verdant', label: 'Verdant Nexus' },
                { id: 'dark', label: 'Dark Graphite' },
                { id: 'light', label: 'Light Mint' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id as DashboardThemeMode)}
                  className={`font-ui-title rounded-xl px-4 py-2 text-sm transition ${
                    theme === item.id
                      ? 'bg-[#34dfb5] text-[#04362c]'
                      : 'border border-[#1d4e41] bg-[#0a2f26] text-[#b5e2d3] hover:bg-[#0f3a2f]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-ui-meta text-[0.68rem] uppercase tracking-[0.12em] text-[#79b6a2]">Cỡ chữ tin nhắn</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {[
                { id: 'small', label: 'Nhỏ' },
                { id: 'medium', label: 'Vừa' },
                { id: 'large', label: 'Lớn' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMessageFontSize(item.id as DashboardMessageFontSize)}
                  className={`font-ui-title rounded-xl px-4 py-2 text-sm transition ${
                    messageFontSize === item.id
                      ? 'bg-[#34dfb5] text-[#04362c]'
                      : 'border border-[#1d4e41] bg-[#0a2f26] text-[#b5e2d3] hover:bg-[#0f3a2f]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              onResetAppearance();
            }}
            className="font-ui-title rounded-xl border border-[#1d4e41] px-4 py-2 text-sm text-[#b5e2d3] hover:bg-[#0f3a2f]"
          >
            Khôi phục mặc định
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyAppearance({ theme, messageFontSize });
            }}
            className="font-ui-title rounded-xl bg-[#34dfb5] px-4 py-2 text-sm text-[#04362c] transition hover:brightness-110"
          >
            Lưu thay đổi
          </button>
        </div>
      </section>
    </section>
  );
}
