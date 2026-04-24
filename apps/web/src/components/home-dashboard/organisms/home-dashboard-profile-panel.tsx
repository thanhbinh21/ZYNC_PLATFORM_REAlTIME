import { useEffect, useState } from 'react';
import type { DashboardIconName } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';
import { updateMyProfile, fetchFriendsCount, type MeUser } from '@/services/users';
import { uploadFile } from '@/services/upload';
import type { FriendUser } from '@/services/friends';
import type { Story, StoryFeedGroup } from '@/services/stories';

interface HomeDashboardProfilePanelProps {
  profile: MeUser | null;
  loading: boolean;
  error: string | null;
  myStories?: Story[];
  feed?: StoryFeedGroup[];
  friends?: FriendUser[];
  onProfileUpdated?: (user: MeUser) => void;
  onOpenCreateStory?: () => void;
  onViewStoryFeed?: (feedIndex: number) => void;
  onViewUserProfile?: (userId: string) => void;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'U';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

function isValidUsername(value: string): boolean {
  return /^[a-z0-9._]{3,30}$/.test(value);
}

export function HomeDashboardProfilePanel({
  profile,
  loading,
  error,
  myStories = [],
  feed = [],
  friends = [],
  onProfileUpdated,
  onOpenCreateStory,
  onViewStoryFeed,
  onViewUserProfile,
}: HomeDashboardProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUploadProgress, setAvatarUploadProgress] = useState(0);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formValues, setFormValues] = useState({
    username: '',
    displayName: '',
    bio: '',
    devRole: '',
    skills: '',
    interests: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
  });
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'stories'>('info');

  useEffect(() => {
    if (!profile) return;
    const fallbackUsername = profile.email?.split('@')[0] ?? profile.displayName.replace(/\s+/g, '_').toLowerCase();
    setFormValues({
      username: profile.username ?? fallbackUsername,
      displayName: profile.displayName ?? '',
      bio: profile.bio ?? '',
      devRole: profile.devRole ?? '',
      skills: profile.skills?.join(', ') ?? '',
      interests: profile.interests?.join(', ') ?? '',
      githubUrl: profile.githubUrl ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      portfolioUrl: profile.portfolioUrl ?? '',
    });
    // Fetch friend count
    fetchFriendsCount()
      .then(setFriendsCount)
      .catch(() => setFriendsCount(0));
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
      <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-5">
        <div className="h-44 animate-pulse rounded-3xl bg-[var(--bg-hover)]" />
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-[var(--bg-hover)]" />
        <div className="mt-4 h-40 animate-pulse rounded-2xl bg-[var(--bg-hover)]" />
      </section>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <section className="rounded-2xl border border-red-300 bg-red-50 p-5 text-red-800">
        <p className="font-ui-title text-lg">Không tải được trang cá nhân</p>
        <p className="mt-2 font-ui-content text-sm text-[#FCA5A5]">{error}</p>
      </section>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────────
  if (!profile) {
    return (
      <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-5 text-[var(--text-primary)]">
        <p className="font-ui-content text-sm">Chưa có dữ liệu profile.</p>
      </section>
    );
  }

  const initials = getInitials(profile.displayName);
  const username = profile.username ?? profile.email?.split('@')[0] ?? profile.displayName.replace(/\s+/g, '_').toLowerCase();
  const joinedYear = profile.createdAt
    ? new Date(profile.createdAt).getFullYear()
    : null;

  const personalInfoItems: Array<{ label: string; value: string; icon: DashboardIconName }> = [
    { label: 'Email', value: profile.email ?? '-', icon: 'message' },
    { label: 'Username', value: `@${username}`, icon: 'profile' },
  ];

  // ─── Save handler ─────────────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    const displayName = formValues.displayName.trim();
    const normalizedUsername = normalizeUsername(formValues.username);

    if (!isValidUsername(normalizedUsername)) {
      setSaveError('Username phải từ 3-30 ký tự và chỉ gồm chữ thường, số, dấu chấm hoặc gạch dưới.');
      return;
    }

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
        setAvatarUploadProgress(0);
        avatarUrlToSave = await uploadFile(avatarFile, 'avatars', {
          onProgress: (percent) => setAvatarUploadProgress(percent),
        });
        setAvatarUploadProgress(100);
      }

      const updated = await updateMyProfile({
        username: normalizedUsername,
        displayName,
        avatarUrl: avatarUrlToSave,
        bio: formValues.bio.trim() || undefined,
        devRole: formValues.devRole.trim() || undefined,
        skills: formValues.skills ? formValues.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        interests: formValues.interests ? formValues.interests.split(',').map(i => i.trim()).filter(Boolean) : undefined,
        githubUrl: formValues.githubUrl.trim() || undefined,
        linkedinUrl: formValues.linkedinUrl.trim() || undefined,
        portfolioUrl: formValues.portfolioUrl.trim() || undefined,
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
      setAvatarUploadProgress(0);
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

  const tabs: Array<{ id: 'info' | 'stories'; label: string; count?: number }> = [
    { id: 'info', label: 'Thông tin' },
    { id: 'stories', label: 'Stories', count: feed.length },
  ];

  return (
    <section className="space-y-5">

      {/* ── Cover card ─────────────────────────────────────────────────────────── */}
      <article className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-sm">
        <div className="relative h-56 bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-500">
          {/* Radial highlight */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_26%,rgba(255,255,255,0.18)_0,transparent_48%)]" />

          {/* Cover label */}
          <p className="font-ui-title absolute right-5 top-5 text-xl tracking-widest text-white/60">
            ZYNC PROFILE
          </p>

          {/* Profile row pinned to bottom */}
          <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-end gap-4">
              <div className="relative h-28 w-28 flex-shrink-0">
                <div className="h-full w-full overflow-hidden rounded-full border-4 border-white bg-accent-light">
                  {profile.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="font-ui-title flex h-full w-full items-center justify-center text-2xl text-accent">
                      {initials}
                    </div>
                  )}
                </div>
                {/* Online dot — outside overflow-hidden wrapper */}
                <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white bg-accent" />
              </div>

              <div>
                <h2 className="font-ui-title text-[clamp(1.4rem,2.7vw,2.7rem)] text-white">
                  {profile.displayName}
                </h2>
                <p className="font-ui-content text-sm text-white/80">@{username}</p>
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
                className="font-ui-title inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-emerald-700 shadow-md transition hover:shadow-lg"
              >
                <DashboardIcon name="edit" className="h-4 w-4" />
                Chỉnh sửa hồ sơ
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* ── Edit form ───────────────────────────────────────────────────────────── */}
      {isEditing && (
        <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 className="font-ui-title text-lg text-[var(--text-primary)]">Cập nhật hồ sơ</h3>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="font-ui-content text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Đóng
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                @Username
              </span>
              <input
                value={formValues.username}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, username: e.target.value }))
                }
                className="font-ui-content h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                placeholder="zync.user"
              />
            </label>

            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Tên hiển thị
              </span>
              <input
                value={formValues.displayName}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, displayName: e.target.value }))
                }
                className="font-ui-content h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                placeholder="Nhập tên hiển thị"
              />
            </label>

            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Ảnh đại diện
              </span>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] p-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 overflow-hidden rounded-full bg-[var(--border)]">
                    {avatarPreviewUrl || profile.avatarUrl ? (
                      <img src={avatarPreviewUrl ?? profile.avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                    ) : (
                      <div className="font-ui-title flex h-full w-full items-center justify-center text-sm text-[var(--text-primary)]">{initials}</div>
                    )}
                  </div>
                  <label className="font-ui-title inline-flex h-9 cursor-pointer items-center rounded-lg bg-[var(--accent)] px-3 text-sm text-[var(--bg-primary)] transition hover:brightness-110">
                    Chọn ảnh
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                  {avatarFile && (
                    <span className="font-ui-content truncate text-xs text-[var(--text-secondary)]">{avatarFile.name}</span>
                  )}
                </div>
                <p className="font-ui-content mt-2 text-xs text-[var(--text-secondary)]">Ảnh sẽ tự upload và cập nhật URL khi bạn bấm Lưu thay đổi.</p>
                {isUploadingAvatar && (
                  <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-hover)] p-2.5">
                    <div className="mb-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                      <span>Đang tải ảnh đại diện</span>
                      <span>{avatarUploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-hover)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)] transition-all"
                        style={{ width: `${avatarUploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </label>

            <label className="space-y-2 sm:col-span-2">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                Giới thiệu
              </span>
              <textarea
                value={formValues.bio}
                onChange={(e) =>
                  setFormValues((prev) => ({ ...prev, bio: e.target.value }))
                }
                className="font-ui-content min-h-24 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
                placeholder="Viết vài dòng giới thiệu"
                maxLength={200}
              />
            </label>

            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">Vai trò Developer</span>
              <input value={formValues.devRole} onChange={(e) => setFormValues(p => ({ ...p, devRole: e.target.value }))} className="font-ui-content h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="Ví dụ: Frontend Developer" />
            </label>
            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">Kỹ năng (cách nhau bằng dấu phẩy)</span>
              <input value={formValues.skills} onChange={(e) => setFormValues(p => ({ ...p, skills: e.target.value }))} className="font-ui-content h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="react, nodejs, python" />
            </label>
            
            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">GitHub URL</span>
              <input value={formValues.githubUrl} onChange={(e) => setFormValues(p => ({ ...p, githubUrl: e.target.value }))} className="font-ui-content h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="https://github.com/..." />
            </label>
            <label className="space-y-2 sm:col-span-1">
              <span className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)]">LinkedIn URL</span>
              <input value={formValues.linkedinUrl} onChange={(e) => setFormValues(p => ({ ...p, linkedinUrl: e.target.value }))} className="font-ui-content h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-hover)] px-3 text-sm text-[var(--text-primary)] outline-none" placeholder="https://linkedin.com/in/..." />
            </label>
          </div>

          {saveError && <p className="mt-3 text-sm text-[#FCA5A5]">{saveError}</p>}

          <div className="mt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="font-ui-title h-10 rounded-xl border border-[var(--border)] px-4 text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={isSaving || isUploadingAvatar}
              className="font-ui-title h-10 rounded-xl bg-[var(--accent)] px-4 text-[var(--bg-primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving || isUploadingAvatar ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </section>
      )}

      {/* ── Tab navigation ──────────────────────────────────────────────────────── */}
      <div className="border border-border bg-bg-hover flex gap-1 rounded-2xl bg-[var(--bg-hover)]/58 p-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`font-ui-title flex-1 rounded-xl px-4 py-2.5 text-sm transition ${
              activeTab === tab.id
                ? 'bg-[var(--accent)] text-[var(--bg-primary)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.id ? 'text-[var(--bg-primary)]/70' : 'text-[var(--accent)]'}`}>
                ({tab.count})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Thông tin ──────────────────────────────────────────────────────── */}
      {activeTab === 'info' && (
        <div className="grid gap-4 xl:grid-cols-[1.02fr_1.35fr]">

          {/* Left column */}
          <div className="space-y-4">

            {/* Personal info */}
            <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4">
              <h3 className="font-ui-title text-sm uppercase tracking-[0.16em] text-[var(--accent)]">
                Thông tin cá nhân
              </h3>
              <div className="mt-4 space-y-3">
                {personalInfoItems.map(({ label, value, icon }) => (
                  <div key={label} className="flex items-center gap-3 rounded-2xl bg-[var(--bg-hover)] p-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#0f3a2e]">
                      <DashboardIcon name={icon} className="h-4 w-4 text-[var(--accent)]" />
                    </div>
                    <div>
                      <p className="font-ui-meta text-[0.62rem] uppercase tracking-[0.12em] text-[var(--text-secondary)]">
                        {label}
                      </p>
                      <p className="font-ui-content mt-0.5 break-all text-sm text-[var(--text-primary)]">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Security placeholder */}
            <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4">
              <h3 className="font-ui-title text-sm uppercase tracking-[0.16em] text-[var(--accent)]">
                Bảo mật
              </h3>
              <div className="mt-3 rounded-2xl bg-[var(--bg-hover)] p-3">
                <p className="font-ui-content text-sm text-[var(--text-secondary)]">Quản lý thiết bị</p>
                <p className="font-ui-content mt-1 text-xs text-[var(--text-secondary)]">Tính năng đang được phát triển.</p>
              </div>
            </section>

            {/* Reputation card */}
            <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4">
              <h3 className="font-ui-title text-sm uppercase tracking-[0.16em] text-[var(--accent)]">
                Danh tiếng
              </h3>

              {/* Trust score bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
                  <span>Điểm tin cậy</span>
                  <span className="font-semibold text-[var(--accent)]">
                    {profile.trustScore ?? 100}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-[var(--bg-hover)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${profile.trustScore ?? 100}%`,
                      background: (profile.trustScore ?? 100) >= 70
                        ? 'linear-gradient(90deg, var(--accent), var(--accent))'
                        : (profile.trustScore ?? 100) >= 40
                        ? '#f59e0b'
                        : '#ef4444',
                    }}
                  />
                </div>
              </div>

              {/* Violation count */}
              <div className="mt-3 flex items-center justify-between rounded-2xl bg-[var(--bg-hover)] px-3 py-2">
                <span className="font-ui-content text-sm text-[var(--text-secondary)]">Lần vi phạm toàn hệ thống</span>
                <span className={`font-ui-title text-sm font-bold ${
                  (profile.globalViolationCount ?? 0) === 0
                    ? 'text-[var(--accent)]'
                    : (profile.globalViolationCount ?? 0) < 3
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}>
                  {profile.globalViolationCount ?? 0}
                </span>
              </div>

              {/* Warning */}
              {(profile.globalViolationCount ?? 0) >= 3 && (
                <div className="mt-3 rounded-2xl border border-red-800/50 bg-red-900/20 px-3 py-2">
                  <p className="font-ui-content text-xs text-red-300">
                    ⚠️ Tài khoản có nguy cơ bị hạn chế do nhiều lần vi phạm. Hãy tuân thủ cộng đồng.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* My Stories (real) */}
            <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="font-ui-title text-lg text-[var(--text-primary)]">Story của tôi</h3>
                <span className="font-ui-content text-sm text-[var(--text-secondary)]">{myStories.length} story</span>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {/* Add story card */}
                <div className="flex h-36 min-w-[84px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-hover)]">
                  <button
                    type="button"
                    onClick={() => onOpenCreateStory?.()}
                    className="flex h-full w-full flex-col items-center justify-center gap-2"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--accent)]">
                      <DashboardIcon name="plus" className="h-4 w-4 text-[var(--accent)]" />
                    </div>
                    <p className="font-ui-meta text-[0.6rem] uppercase tracking-[0.1em] text-[var(--accent)]">
                      Thêm Story
                    </p>
                  </button>
                </div>

                {myStories.slice(0, 5).map((story) => (
                  <div
                    key={story._id}
                    className="h-36 min-w-[84px] rounded-2xl border border-[var(--border)] bg-[var(--bg-hover)] overflow-hidden"
                  >
                    {story.mediaType === 'image' && story.mediaUrl ? (
                      <img src={story.mediaUrl} alt="story" className="h-full w-full object-cover" />
                    ) : story.mediaType === 'video' && story.mediaUrl ? (
                      <div className="flex h-full items-center justify-center bg-[var(--bg-hover)]">
                        <span className="text-2xl">🎬</span>
                      </div>
                    ) : (
                      <div
                        className="flex h-full items-center justify-center p-2"
                        style={{ backgroundColor: story.backgroundColor || 'var(--bg-hover)' }}
                      >
                        <p className="font-ui-content text-xs text-white text-center line-clamp-3">
                          {story.content || 'Story'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {myStories.length === 0 && (
                  <p className="flex items-center px-4 font-ui-content text-sm text-[var(--text-secondary)]">Bạn chưa có story nào.</p>
                )}
              </div>
            </section>

            {/* Bio + Real stats */}
            <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4">
              <h3 className="font-ui-title text-lg text-[var(--text-primary)]">Giới thiệu</h3>
              <p className="font-ui-content mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
                {profile.bio ?? 'Chưa cập nhật giới thiệu.'}
              </p>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { value: friendsCount ?? friends.length, label: 'Bạn bè' },
                  { value: myStories.length, label: 'Story' },
                  { value: joinedYear ?? '-', label: 'Tham gia' },
                ].map(({ value, label }) => (
                  <div key={label} className="rounded-2xl bg-[var(--bg-hover)] p-3 text-center">
                    <p className="font-ui-title text-2xl text-[var(--accent)]">{value}</p>
                    <p className="font-ui-meta mt-1 text-[0.62rem] uppercase tracking-[0.08em] text-[var(--text-secondary)]">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* Developer Info */}
            <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4">
              <h3 className="font-ui-title text-lg text-[var(--text-primary)]">Hồ sơ Developer</h3>
              {profile.devRole && <p className="font-ui-content mt-2 text-sm text-[var(--accent)] font-medium">{profile.devRole}</p>}
              
              {profile.skills && profile.skills.length > 0 && (
                <div className="mt-3">
                  <p className="font-ui-meta text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-2">Kỹ năng</p>
                  <div className="flex flex-wrap gap-2">
                    {profile.skills.map(skill => (
                      <span key={skill} className="px-2.5 py-1 bg-[var(--border)] text-[var(--text-primary)] text-xs rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>
              )}
              
              {(profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl) && (
                <div className="mt-4 flex gap-3">
                  {profile.githubUrl && <a href={profile.githubUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] text-sm hover:underline">GitHub</a>}
                  {profile.linkedinUrl && <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] text-sm hover:underline">LinkedIn</a>}
                  {profile.portfolioUrl && <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] text-sm hover:underline">Portfolio</a>}
                </div>
              )}
            </section>
          </div>
        </div>
      )}


      {/* ── Tab: Stories Feed ───────────────────────────────────────────────────── */}
      {activeTab === 'stories' && (
        <section className="rounded-2xl border border-border bg-bg-card shadow-sm p-4">
          <h3 className="font-ui-title mb-4 text-lg text-[var(--text-primary)]">
            Story của bạn bè ({feed.length})
          </h3>
          {feed.length === 0 ? (
            <p className="font-ui-content text-sm text-[var(--text-secondary)]">Bạn bè chưa đăng story nào.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {feed.map((group, idx) => (
                <button
                  key={group.userId}
                  type="button"
                  onClick={() => onViewStoryFeed?.(idx)}
                  className="flex items-center gap-3 rounded-2xl bg-[var(--bg-hover)] p-3 text-left transition hover:bg-[var(--bg-hover)]"
                >
                  <div className="relative h-12 w-12 flex-shrink-0">
                    <div className="h-full w-full overflow-hidden rounded-full ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-hover)]">
                      {group.avatarUrl ? (
                        <img src={group.avatarUrl} alt={group.displayName} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-[var(--text-secondary)] text-sm font-bold text-[var(--bg-hover)]">
                          {getInitials(group.displayName)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-ui-title truncate text-sm text-[var(--text-primary)]">{group.displayName}</p>
                    <p className="font-ui-content text-xs text-[var(--text-secondary)]">{group.stories.length} story</p>
                  </div>
                  <span className="font-ui-content text-xs text-[var(--accent)]">Xem →</span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
    </section>
  );
}