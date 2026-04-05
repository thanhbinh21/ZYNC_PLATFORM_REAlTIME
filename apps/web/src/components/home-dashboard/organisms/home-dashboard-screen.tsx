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

interface HomeDashboardScreenProps {
  data: DashboardHomeMockData;
  storySlot?: React.ReactNode;
  chatSlot?: React.ReactNode;
  profileSlot?: React.ReactNode;
  settingsSlot?: React.ReactNode;
  activeNavId?: string;
  onNavSelect?: (id: string) => void;
}

export function HomeDashboardScreen({
  data,
  storySlot,
  chatSlot,
  profileSlot,
  settingsSlot,
  activeNavId,
  onNavSelect,
}: HomeDashboardScreenProps) {
  const selectedNavId = activeNavId ?? data.navItems.find((item) => item.active)?.id ?? data.navItems[0]?.id;
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const sectionClassName = selectedNavId === 'chat'
    ? 'flex h-screen min-h-0 flex-col overflow-hidden px-4 py-5 sm:px-6 lg:px-8'
    : 'flex h-screen flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8';
  const handleSelectNav = (id: string) => {
    onNavSelect?.(id);
    setIsMobileSidebarOpen(false);
  };

  return (
    <main className="zync-dashboard-main h-screen overflow-hidden text-[#d9f8ec]">
      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#1a5140] bg-[#0d3128]/95 text-[#d7f3e9] lg:hidden"
        aria-label="Mở thanh điều hướng"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 lg:hidden" onClick={() => setIsMobileSidebarOpen(false)}>
          <aside
            className="h-full w-[84%] max-w-[320px] overflow-y-auto border-r border-[#124335] bg-[linear-gradient(180deg,#0a2d24_0,#08241e_100%)] px-4 py-6"
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d3128] text-[#d7f3e9]"
                aria-label="Đóng thanh điều hướng"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-[#0d3228] px-3 py-3">
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
        <aside className="sticky top-0 hidden h-screen flex-col overflow-y-auto border-r border-[#124335] bg-[linear-gradient(180deg,#0a2d24_0,#08241e_100%)] px-4 py-6 lg:flex">
          <div className="flex items-center gap-3 px-2">
            <span className="relative block h-10 w-10 overflow-hidden rounded-xl bg-[#0a3e31] ring-1 ring-[#57d2a5]/35">
              <Image src="/logo.png" alt="Logo Zync" fill className="object-cover" sizes="40px" priority />
            </span>
            <p className="font-ui-brand text-4xl leading-none text-[#39e0af]">{data.brand}</p>
          </div>

          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-[#0d3228] px-3 py-3">
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
            <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#062920]/80 px-4 py-3">
              <h1 className="font-ui-title text-[clamp(1.3rem,2.3vw,2rem)] text-[#e4fff5]">{data.greeting}</h1>
              <div className="flex items-center gap-3">
                <label className="relative hidden h-11 w-[280px] items-center rounded-full border border-[#1a5140] bg-[#0f2f27] pl-10 pr-4 sm:flex">
                  <span className="absolute left-4 text-[#6cb9a2]">
                    <DashboardIcon name="search" className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    placeholder={data.searchPlaceholder}
                    className="font-ui-content w-full bg-transparent text-sm text-[#cdece0] outline-none placeholder:text-[#739f91]"
                  />
                </label>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0d3128] text-[#cdece0] transition hover:bg-[#14463a]">
                  <DashboardIcon name="bell" className="h-4 w-4" />
                </button>
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0d3128] text-[#cdece0] transition hover:bg-[#14463a]">
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

              <section className="mt-8 rounded-3xl border border-[#103b30] bg-[#051f19]/70 p-4 sm:p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-ui-title text-[clamp(1.35rem,2.3vw,2rem)] text-[#defaee]">{data.activityTitle}</h2>
                  <Link href="/friends" className="font-ui-title text-sm text-[#43e6b8] transition hover:text-[#91ffdc]">
                    {data.activityCtaLabel}
                  </Link>
                </div>

                <div className="space-y-2">
                  {data.activities.map((item) => (
                    <DashboardActivityItemRow key={item.id} item={item} />
                  ))}
                </div>
              </section>
            </>
          )}

          {selectedNavId !== 'chat' && (
            <button
              type="button"
              className="fixed bottom-6 right-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#30d7ab] text-[#023328] shadow-[0_10px_26px_rgba(22,193,150,0.35)] transition hover:brightness-110"
            >
              <DashboardIcon name="edit" className="h-5 w-5" />
            </button>
          )}
        </section>
      </div>
    </main>
  );
}
