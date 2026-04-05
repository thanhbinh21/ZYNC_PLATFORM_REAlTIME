import { useEffect, useState } from 'react';
import type { DashboardIconName, DashboardStoryItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';
import { updateMyProfile, type MeUser } from '@/services/users';
import { uploadFile } from '@/services/upload';

interface HomeDashboardProfilePanelProps {
  profile: MeUser | null;
  loading: boolean;
  error: string | null;
  stories: DashboardStoryItem[];
  onProfileUpdated?: (user: MeUser) => void;
  onOpenCreateStory?: () => void;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function HomeDashboardProfilePanel({
  profile,
  loading,
  error,
  stories,
  onProfileUpdated,
  onOpenCreateStory,
}: HomeDashboardProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState({
    displayName: '',
    bio: '',
  });

  useEffect(() => {
    if (!profile) return;
    setFormValues({
      displayName: profile.displayName ?? '',
      bio: profile.bio ?? '',
    });
  }, [profile]);

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [avatarFile]);

  // ─── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="rounded-3xl border border-[#103b30] bg-[#051f19]/70 p-5">
        <div className="h-44 animate-pulse rounded-3xl bg-[#0f3a31]" />
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-[#0d3228]" />
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-[#0d3228]" />
      </section>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="rounded-3xl border border-[#4d2a2a] bg-[#2a1515]/60 p-5 text-[#ffd7d7]">
        <p className="font-ui-title text-lg">Không tải được trang cá nhân</p>
        <p className="mt-2 font-ui-content text-sm text-[#ffc3c3]">{error}</p>
      </section>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <section className="rounded-3xl border border-[#103b30] bg-[#051f19]/70 p-5 text-[#d6f4e9]">
        <p className="font-ui-content text-sm">Chưa có dữ liệu profile.</p>
      </section>
    );
  }

  const initials = getInitials(profile.displayName);
  const username = (
    profile.email?.split('@')[0] ??
    profile.displayName.replace(/\s+/g, '_')
  ).toLowerCase();
  const joinedYear = profile.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : null;

  const personalInfoItems: Array<{ label: string; value: string; icon: DashboardIconName }> = [
    { label: 'Số điện thoại', value: profile.phoneNumber ?? '-', icon: 'chat' },
    { label: 'Email', value: profile.email ?? '-', icon: 'message' },
    { label: 'Username', value: username, icon: 'profile' },
  ];

  const deviceItems: Array<{
    name: string;
    location: string;
    status: string;
    active: boolean;
    icon: DashboardIconName;
  }> = [
    {
      name: 'MacBook Pro M2',
      location: 'TP. Hồ Chí Minh',
      status: 'Đang hoạt động',
      active: true,
      icon: 'settings',
    },
    {
      name: 'iPhone 15 Pro',
      location: 'TP. Hồ Chí Minh',
      status: '2 giờ trước',
      active: false,
      icon: 'profile',
    },
  ];

  // ─── Save handler ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    const displayName = formValues.displayName.trim();
    if (!displayName) {
      setSaveError('Tên hiển thị không được để trống.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      let avatarUrlToSave = profile.avatarUrl;

      if (avatarFile) {
        setIsUploadingAvatar(true);
        avatarUrlToSave = await uploadFile(avatarFile, 'avatars');
      }

      const updated = await updateMyProfile({
        displayName,
        avatarUrl: avatarUrlToSave,
        bio: formValues.bio.trim() || undefined,
      });
      onProfileUpdated?.(updated);
      setAvatarFile(null);
      setIsEditing(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.toLowerCase().includes('invalid api key') || message.toLowerCase().includes('invalid signature')) {
        setSaveError('Không thể upload ảnh đại diện do cấu hình Cloudinary không hợp lệ. Vui lòng kiểm tra CLOUDINARY_* trong server.');
      } else {
        setSaveError('Cập nhật hồ sơ thất bại. Vui lòng thử lại.');
      }
    } finally {
      setIsUploadingAvatar(false);
      setIsSaving(false);
    }
  };

  const handleAvatarFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSaveError('Vui lòng chọn tệp ảnh hợp lệ (jpg, png, webp...).');
      return;
    }

    setSaveError(null);
    setAvatarFile(file);
  };

  return (
    <section className="space-y-5">

      {/* ── Cover card ─────────────────────────────────────────────────────────── */}
      <article className="overflow-hidden rounded-3xl border border-[#104638] bg-[#041f18]">
        <div className="relative h-56 bg-[linear-gradient(120deg,#d8d2cc_0%,#c7beb4_52%,#b3a292_100%)]">
          {/* Radial highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.18)_0,transparent_48%)]" />

          {/* Cover label */}
          <p className="font-ui-title absolute right-5 top-5 text-xl tracking-[0.12em] text-[#1f2523]">
            MINIMAL COVER
          </p>

          {/* Profile row pinned to bottom */}
          <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-end gap-4">
              <div className="relative h-28 w-28 flex-shrink-0">
                <div className="h-full w-full overflow-hidden rounded-full border-4 border-[#021d16] bg-[#d9ece4]">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="font-ui-title flex h-full w-full items-center justify-center text-2xl text-[#0a2d24]">
                      {initials}
                    </div>
                  )}
                </div>
                {/* Online dot — outside overflow-hidden wrapper */}
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-[#021d16] bg-[#32ddb2]" />
              </div>

              <div>
                <h2 className="font-ui-title text-[clamp(1.4rem,2.7vw,2.7rem)] text-[#e8fff6]">
                  {profile.displayName}
                </h2>
                <p className="font-ui-content text-sm text-[#bfe7da]">@{username}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSaveError(null);
                  setAvatarFile(null);
                  setIsEditing(true);
                }}
                className="font-ui-title inline-flex h-11 items-center gap-2 rounded-full bg-[#2fe0b4] px-5 text-[#04342a] transition hover:brightness-110"
              >
                <DashboardIcon name="edit" className="h-4 w-4" />
                Chỉnh sửa hồ sơ
              </button>

              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#1a5444] text-[#7cb3a1] transition hover:bg-[#0e3429]"
                aria-label="Cài đặt"
              >
                <DashboardIcon name="settings" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ── Edit form ───────────────────────────────────────────────────────────── */}
      {isEditing && (
        <section className="rounded-3xl border border-[#11513f] bg-[#07261f]/90 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-ui-title text-lg text-[#e2fff4]">Cập nhật hồ sơ</h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="font-ui-content text-sm text-[#8ec5b4] hover:text-[#d8fff2]"
            >
              Đóng
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[#7cb3a1]">
                Tên hiển thị
              </span>
              <input
                value={formValues.displayName}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, displayName: e.target.value }))
                }
                className="font-ui-content h-11 w-full rounded-xl border border-[#1a5444] bg-[#0e3429] px-3 text-sm text-[#e1fff4] outline-none placeholder:text-[#6fa493]"
                placeholder="Nhập tên hiển thị"
              />
            </label>

            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[#7cb3a1]">
                Ảnh đại diện
              </span>
              <div className="rounded-xl border border-[#1a5444] bg-[#0e3429] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-[#244c40]">
                    {avatarPreviewUrl || profile.avatarUrl ? (
                      <img src={avatarPreviewUrl ?? profile.avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="font-ui-title flex h-full w-full items-center justify-center text-sm text-[#d8f9ec]">{initials}</div>
                    )}
                  </div>
                  <label className="font-ui-title inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#2fe0b4] px-3 text-sm text-[#04342a] transition hover:brightness-110">
                    Chọn ảnh
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                  {avatarFile && (
                    <span className="font-ui-content truncate text-xs text-[#9cc8b9]">{avatarFile.name}</span>
                  )}
                </div>
                <p className="font-ui-content mt-2 text-xs text-[#7ba999]">Ảnh sẽ tự upload và cập nhật URL khi bạn bấm Lưu thay đổi.</p>
              </div>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[#7cb3a1]">
                Giới thiệu
              </span>
              <textarea
                value={formValues.bio}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="font-ui-content min-h-24 w-full rounded-xl border border-[#1a5444] bg-[#0e3429] px-3 py-2 text-sm text-[#e1fff4] outline-none placeholder:text-[#6fa493]"
                placeholder="Viết vài dòng giới thiệu"
                maxLength={200}
              />
            </label>
          </div>

          {saveError && <p className="mt-3 text-sm text-[#ffb8b8]">{saveError}</p>}

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="font-ui-title h-10 rounded-xl border border-[#1a5444] px-4 text-[#bbebdc] hover:bg-[#10382d]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving || isUploadingAvatar}
              className="font-ui-title h-10 rounded-xl bg-[#2fe0b4] px-4 text-[#04342a] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving || isUploadingAvatar ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </section>
      )}

      {/* ── Body grid ───────────────────────────────────────────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-[1.02fr_1.35fr]">

        {/* Left column */}
        <div className="space-y-4">

          {/* Personal info */}
          <section className="rounded-3xl border border-[#103b30] bg-[#051f19]/70 p-4">
            <h3 className="font-ui-title text-sm uppercase tracking-[0.16em] text-[#4cf0bf]">
              Thông tin cá nhân
            </h3>
            <div className="mt-4 space-y-3">
              {personalInfoItems.map(({ label, value, icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-2xl bg-[#0b2f25] p-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f3a2e]">
                    <DashboardIcon name={icon} className="h-4 w-4 text-[#4cf0bf]" />
                  </div>
                  <div>
                    <p className="font-ui-meta text-[0.62rem] uppercase tracking-[0.12em] text-[#78ad9d]">
                      {label}
                    </p>
                    <p className="font-ui-content mt-0.5 break-all text-sm text-[#d4f8eb]">
                      {value}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Logged-in devices */}
          <section className="rounded-3xl border border-[#103b30] bg-[#051f19]/70 p-4">
            <h3 className="font-ui-title text-sm uppercase tracking-[0.16em] text-[#4cf0bf]">
              Thiết bị đã đăng nhập
            </h3>
            <div className="mt-3 space-y-4">
              {deviceItems.map(({ name, location, status, active, icon }) => (
                <div key={name} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0b2f25]">
                    <DashboardIcon name={icon} className="h-4 w-4 text-[#78ad9d]" />
                  </div>
                  <div className="flex-1">
                    <p className="font-ui-content text-sm text-[#c5e8dd]">{name}</p>
                    <p className="font-ui-content text-xs text-[#7eac9d]">
                      {location} •{' '}
                      <span className={active ? 'text-[#32ddb2]' : ''}>{status}</span>
                    </p>
                  </div>
                  {active && (
                    <span className="h-2 w-2 rounded-full bg-[#32ddb2]" />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="font-ui-meta mt-4 w-full rounded-2xl border border-[#1a5444] py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-[#bbebdc] transition hover:bg-[#10382d]"
            >
              Quản lý tất cả thiết bị
            </button>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Stories */}
          <section className="rounded-3xl border border-[#103b30] bg-[#051f19]/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-ui-title text-lg text-[#dffcf0]">Story của tôi</h3>
              <button
                type="button"
                className="font-ui-title text-sm text-[#4cf0bf] hover:text-[#8effdb]"
              >
                Xem tất cả
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {/* Add story card */}
              <div className="flex h-36 min-w-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#1b5143] bg-[#0a3228]">
                <button
                  type="button"
                  onClick={() => onOpenCreateStory?.()}
                  className="flex h-full w-full flex-col items-center justify-center gap-2"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#2fe0b4]">
                    <DashboardIcon name="plus" className="h-4 w-4 text-[#2fe0b4]" />
                  </div>
                  <p className="font-ui-meta text-[0.6rem] uppercase tracking-[0.1em] text-[#4cf0bf]">
                    Thêm Story
                  </p>
                </button>
              </div>

              {stories.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="h-36 min-w-[84px] rounded-2xl border border-[#1b5143] bg-[#0a3228] p-2"
                >
                  <div
                    className={`h-full rounded-xl ${item.toneClass} flex items-end p-2 text-[#eafff7]`}
                  >
                    <p className="font-ui-title text-xs">{item.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bio + stats */}
          <section className="rounded-3xl border border-[#103b30] bg-[#051f19]/70 p-4">
            <h3 className="font-ui-title text-lg text-[#dffcf0]">Giới thiệu</h3>
            <p className="font-ui-content mt-3 text-sm leading-relaxed text-[#cbeee2]">
              {profile.bio ?? 'Chưa cập nhật giới thiệu.'}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { value: '1.2k', label: 'Bạn bè' },
                { value: '850', label: 'Theo dõi' },
                { value: '156', label: 'Khoảnh khắc' },
                { value: joinedYear ?? '-', label: 'Tham gia' },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-2xl bg-[#193f34] p-3 text-center">
                  <p className="font-ui-title text-2xl text-[#41e8ba]">{value}</p>
                  <p className="font-ui-meta mt-1 text-[0.62rem] uppercase tracking-[0.08em] text-[#91baa9]">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}