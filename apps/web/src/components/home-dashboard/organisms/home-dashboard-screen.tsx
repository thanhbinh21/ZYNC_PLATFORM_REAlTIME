'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { DashboardHomeMockData } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';
import { DashboardNavItemRow } from '../molecules/dashboard-nav-item';
import { DashboardStoryItemRow } from '../molecules/dashboard-story-item';
import { DashboardStatCard } from '../molecules/dashboard-stat-card';
import { DashboardActivityItemRow } from '../molecules/dashboard-activity-item';
import { searchFriendCandidates, sendFriendRequest, type FriendUser } from '@/services/friends';

import type { DashboardActivityItem } from '../home-dashboard.types';

interface HomeDashboardScreenProps {
  data: DashboardHomeMockData;
  storySlot?: React.ReactNode;
  chatSlot?: React.ReactNode;
  profileSlot?: React.ReactNode;
  settingsSlot?: React.ReactNode;
  notificationSlot?: React.ReactNode;
  activeNavId?: string;
  onNavSelect?: (id: string) => void;
  onViewUserProfile?: (userId: string) => void;
  onActivityClick?: (item: DashboardActivityItem) => void;
  onLogout?: () => void;
}

export function HomeDashboardScreen({
  data,
  storySlot,
  chatSlot,
  profileSlot,
  settingsSlot,
  notificationSlot,
  activeNavId,
  onNavSelect,
  onViewUserProfile,
  onActivityClick,
  onLogout,
}: HomeDashboardScreenProps) {
  const selectedNavId = activeNavId ?? data.navItems.find((item) => item.active)?.id ?? data.navItems[0]?.id;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const sectionClassName = selectedNavId === 'chat'
    ? 'flex h-screen min-h-0 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8'
    : 'flex h-screen flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8';
  const handleSelectNav = (id: string) => {
    if (id === 'logout') {
      onLogout?.();
      return;
    }
    onNavSelect?.(id);
    setIsMobileSidebarOpen(false);
  };

  // ─── Search state ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (value.trim().length < 2) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchFriendCandidates(value.trim());
        setSearchResults(results);
        setSearchOpen(true);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }, []);

  const handleSendFriendRequest = useCallback(async (userId: string) => {
    try {
      await sendFriendRequest(userId);
      setSentRequests((prev) => new Set(prev).add(userId));
    } catch {
      /* silent */
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <main className="zync-dashboard-main h-screen overflow-hidden text-[#d9f8ec]">
      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="zync-glass-panel zync-glass-floating fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full text-[#f0fff9] lg:hidden"
        aria-label="Mở thanh điều hướng"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)}>
          <aside
            className="zync-glass-panel zync-glass-panel-strong h-full w-[84%] max-w-[320px] overflow-y-auto rounded-r-[2rem] border-r px-4 py-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3 px-1">
                <span className="relative block h-9 w-9 overflow-hidden rounded-xl bg-[#0a3e31] ring-1 ring-[#57d2a5]/35">
                  <Image src="/logo.png" alt="Logo Zync" fill className="object-cover" sizes="36px" priority />
                </span>
                <p className="font-ui-brand text-3xl leading-none text-[#39e0af]">{data.brand}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="zync-glass-subtle inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d3128]/66 text-[#e9fff7]"
                aria-label="Đóng thanh điều hướng"
              >
                ✕
              </button>
            </div>

            <div className="zync-glass-subtle mt-6 flex items-center gap-3 rounded-2xl bg-[#0d3228]/52 px-3 py-3">
              <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#b0e4d2] text-sm font-semibold text-[#0a2a22]">
                {data.user.avatarUrl ? (
                  <Image
                    src={data.user.avatarUrl}
                    alt={data.user.displayName}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  data.user.initials
                )}
              </span>
              <div>
                <p className="font-ui-title text-[0.97rem] text-[#dcfff3]">{data.user.displayName}</p>
                <p className="font-ui-content text-xs text-[#87ac9f]">{data.user.roleLabel}</p>
              </div>
            </div>

            <div className="mt-6 space-y-1">
              {data.navItems.map((item) => (
                <DashboardNavItemRow
                  key={item.id}
                  item={item}
                  isActive={item.id === selectedNavId}
                  onClick={(navItem) => handleSelectNav(navItem.id)}
                />
              ))}
            </div>

            <button
              type="button"
              className="font-ui-title mt-8 h-12 w-full rounded-xl bg-[#30d7ab] text-lg text-[#033026] transition hover:brightness-110"
            >
              {data.primaryAction}
            </button>

            <div className="mt-6 space-y-1 border-t border-[#143d32] pt-4">
              {data.sideFooterItems.map((item) => (
                <DashboardNavItemRow
                  key={item.id}
                  item={item}
                  isActive={item.id === selectedNavId}
                  onClick={(navItem) => handleSelectNav(navItem.id)}
                />
              ))}
            </div>
          </aside>
        </div>
      )}

      <div className="grid h-screen grid-cols-1 lg:grid-cols-[220px_1fr]">
        <aside className="zync-glass-panel zync-glass-panel-strong sticky top-0 hidden h-screen flex-col overflow-y-auto border-r px-4 py-6 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="relative block h-10 w-10 overflow-hidden rounded-xl bg-[#0a3e31] ring-1 ring-[#57d2a5]/35">
              <Image src="/logo.png" alt="Logo Zync" fill className="object-cover" sizes="40px" priority />
            </span>
            <p className="font-ui-brand text-4xl leading-none text-[#39e0af]">{data.brand}</p>
          </div>

          <div className="zync-glass-subtle mt-8 flex items-center gap-3 rounded-2xl bg-[#0d3228]/52 px-3 py-3">
            <span className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#b0e4d2] text-sm font-semibold text-[#0a2a22]">
              {data.user.avatarUrl ? (
                <Image
                  src={data.user.avatarUrl}
                  alt={data.user.displayName}
                  width={40}
                  height={40}
                  className="h-full w-full object-cover"
                />
              ) : (
                data.user.initials
              )}
            </span>
            <div>
              <p className="font-ui-title text-[0.97rem] text-[#dcfff3]">{data.user.displayName}</p>
              <p className="font-ui-content text-xs text-[#87ac9f]">{data.user.roleLabel}</p>
            </div>
          </div>

          <div className="mt-6 space-y-1">
            {data.navItems.map((item) => (
              <DashboardNavItemRow
                key={item.id}
                item={item}
                isActive={item.id === selectedNavId}
                  onClick={(navItem) => handleSelectNav(navItem.id)}
              />
            ))}
          </div>

          <button
            type="button"
            className="font-ui-title mt-auto h-12 rounded-xl bg-[#30d7ab] text-lg text-[#033026] transition hover:brightness-110"
          >
            {data.primaryAction}
          </button>

          <div className="mt-6 space-y-1 border-t border-[#143d32] pt-4">
            {data.sideFooterItems.map((item) => (
              <DashboardNavItemRow
                key={item.id}
                item={item}
                isActive={item.id === selectedNavId}
                  onClick={(navItem) => handleSelectNav(navItem.id)}
              />
            ))}
          </div>
        </aside>

        <section className={sectionClassName}>
          {selectedNavId === 'home' && (
            <header className="zync-glass-panel zync-glass-floating z-20 flex flex-wrap items-center justify-between gap-4 !overflow-visible rounded-2xl px-4 py-3">
              <h1 className="font-ui-title text-[clamp(1.3rem,2.3vw,2rem)] text-[#e4fff5]">{data.greeting}</h1>
              <div className="flex items-center gap-3">
                {/* ─── Search bar with live results ─── */}
                <div ref={searchContainerRef} className="relative hidden sm:block">
                  <label className="zync-glass-subtle relative flex h-11 w-[320px] items-center rounded-full border-[#85f6ce]/24 bg-[#0f2f27]/52 pl-10 pr-4">
                    <span className="absolute left-4 text-[#6cb9a2]">
                      <DashboardIcon name="search" className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => { if (searchResults.length > 0) setSearchOpen(true); }}
                      placeholder="Tìm bạn theo @username hoặc email..."
                      className="font-ui-content w-full bg-transparent text-sm text-[#cdece0] outline-none placeholder:text-[#739f91]"
                    />
                    {searchLoading && (
                      <span className="absolute right-4 h-4 w-4 animate-spin rounded-full border-2 border-[#30d7ab] border-t-transparent" />
                    )}
                  </label>

                  {/* Dropdown results */}
                  {searchOpen && searchResults.length > 0 && (
                    <div className="zync-glass-panel zync-glass-floating absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-80 overflow-y-auto rounded-2xl border-[#9effda]/25 bg-[#051f19]/76 shadow-xl">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 border-b border-[#0d3228]/55 px-4 py-3 transition last:border-b-0 hover:bg-[#0d3228]/72"
                        >
                          <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full bg-[#b0e4d2]">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.displayName} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs font-bold text-[#0a2a22]">
                                {user.displayName.slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-ui-title truncate text-sm text-[#e4fff5]">{user.displayName}</p>
                            {user.username && <p className="font-ui-content truncate text-xs text-[#8fd0bc]">@{user.username}</p>}
                            {user.email && <p className="font-ui-content truncate text-xs text-[#79b4a2]">{user.email}</p>}
                            {user.bio && <p className="font-ui-content truncate text-xs text-[#7cb3a1]">{user.bio}</p>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => { onViewUserProfile?.(user.id); setSearchOpen(false); }}
                              className="font-ui-title h-8 rounded-lg border border-[#1a5444] px-3 text-xs text-[#bbebdc] hover:bg-[#10382d] transition"
                            >
                              Xem
                            </button>
                            {sentRequests.has(user.id) ? (
                              <span className="font-ui-content text-xs text-[#4cf0bf]">Đã gửi</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSendFriendRequest(user.id)}
                                className="font-ui-title h-8 rounded-lg bg-[#2fe0b4] px-3 text-xs text-[#04342a] hover:brightness-110 transition"
                              >
                                Kết bạn
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {searchOpen && searchResults.length === 0 && searchQuery.trim().length >= 2 && !searchLoading && (
                    <div className="zync-glass-panel absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-2xl border-[#9effda]/25 bg-[#051f19]/78 px-4 py-4 text-center shadow-xl">
                      <p className="font-ui-content text-sm text-[#7cb3a1]">Không tìm thấy người dùng nào.</p>
                    </div>
                  )}
                </div>

                {notificationSlot ?? (
                  <button type="button" className="zync-glass-subtle inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0d3128]/62 text-[#e5fff4] transition hover:bg-[#14463a]/72">
                    <DashboardIcon name="bell" className="h-4 w-4" />
                  </button>
                )}
                <button type="button" className="zync-glass-subtle inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0d3128]/62 text-[#e5fff4] transition hover:bg-[#14463a]/72">
                  <DashboardIcon name="gear" className="h-4 w-4" />
                </button>
              </div>
            </header>
          )}

          {selectedNavId === 'chat' ? (
            <div className="mt-1 flex min-h-0 w-full flex-1">{chatSlot}</div>
          ) : selectedNavId === 'settings' ? (
            <div className="mt-1">{settingsSlot}</div>
          ) : selectedNavId === 'profile' ? (
            <div className="mt-5">{profileSlot}</div>
          ) : (
            <>
              <div className="mt-5">
                {storySlot ?? (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {data.stories.map((item) => (
                      <DashboardStoryItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-3">
                {data.stats.map((item) => (
                  <DashboardStatCard key={item.id} item={item} />
                ))}
              </div>

              <section className="zync-glass-panel mt-8 rounded-3xl p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-ui-title text-[clamp(1.35rem,2.3vw,2rem)] text-[#defaee]">{data.activityTitle}</h2>
                  <Link href="/friends" className="font-ui-title text-sm text-[#43e6b8] transition hover:text-[#91ffdc]">
                    {data.activityCtaLabel}
                  </Link>
                </div>

                <div className="space-y-2">
                  {data.activities.map((item) => (
                    <DashboardActivityItemRow
                      key={item.id}
                      item={item}
                      onClick={onActivityClick}
                    />
                  ))}
                </div>
              </section>
            </>
          )}

        </section>
      </div>
    </main>
  );
}

