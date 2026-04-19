'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { DashboardHomeMockData } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';
import { DashboardNavItemRow } from '../molecules/dashboard-nav-item';
import { DashboardStoryItemRow } from '../molecules/dashboard-story-item';
import { DashboardStatCard } from '../molecules/dashboard-stat-card';
import { DashboardActivityItemRow } from '../molecules/dashboard-activity-item';

import type { DashboardActivityItem } from '../home-dashboard.types';

interface HomeDashboardScreenProps {
  data: DashboardHomeMockData;
  storySlot?: React.ReactNode;
  chatSlot?: React.ReactNode;
  profileSlot?: React.ReactNode;
  settingsSlot?: React.ReactNode;
  friendsSlot?: React.ReactNode;
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
  friendsSlot,
  notificationSlot,
  activeNavId,
  onNavSelect,
  onViewUserProfile,
  onActivityClick,
  onLogout,
}: HomeDashboardScreenProps) {
  const selectedNavId = activeNavId ?? data.navItems.find((item) => item.active)?.id ?? data.navItems[0]?.id;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const sectionClassName = 'flex min-h-0 flex-1 flex-col overflow-hidden';
  const handleSelectNav = (id: string) => {
    if (id === 'logout') {
      onLogout?.();
      return;
    }
    onNavSelect?.(id);
    setIsMobileSidebarOpen(false);
  };

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

      <div className="flex h-screen overflow-hidden gap-3 p-3 lg:gap-5 lg:p-5">
        <aside className="zync-glass-panel zync-glass-panel-strong hidden h-full w-[260px] flex-col overflow-y-auto rounded-3xl border-none px-4 py-6 shadow-2xl lg:flex">
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

        <section className={`${sectionClassName} zync-glass-panel rounded-3xl border-none shadow-xl`}>
          {selectedNavId === 'home' && (
            <header className="zync-glass-panel zync-glass-floating flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-3">
              <h1 className="font-ui-title text-[clamp(1.3rem,2.3vw,2rem)] text-[#e4fff5]">{data.greeting}</h1>
              <div className="flex items-center gap-3">
                {/* Search bar removed from Trang chủ as requested */}

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

          {/* Scrollable Content Wrapper */}
          <div className={`flex-1 ${selectedNavId === 'chat' || selectedNavId === 'friends' ? 'overflow-hidden' : 'overflow-y-auto px-4 py-3 pb-20 sm:px-6'}`}>
            {selectedNavId === 'chat' ? (
              <div className="flex h-full w-full">{chatSlot}</div>
            ) : selectedNavId === 'settings' ? (
              <div>{settingsSlot}</div>
            ) : selectedNavId === 'profile' ? (
              <div className="mt-5">{profileSlot}</div>
            ) : selectedNavId === 'friends' ? (
              <div className="flex h-full w-full">{friendsSlot}</div>
            ) : (
            <>
              <div className="mt-5 shrink-0">
                {storySlot ?? (
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    {data.stories.map((item) => (
                      <DashboardStoryItemRow key={item.id} item={item} />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-4 shrink-0 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {data.stats.map((item) => (
                  <DashboardStatCard key={item.id} item={item} />
                ))}
              </div>

              <section className="zync-glass-panel mt-8 shrink-0 rounded-3xl p-4 sm:p-5">
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
                <div className="h-10 shrink-0" tabIndex={-1} />
              </>
            )}
          </div>

        </section>
      </div>
    </main>
  );
}

