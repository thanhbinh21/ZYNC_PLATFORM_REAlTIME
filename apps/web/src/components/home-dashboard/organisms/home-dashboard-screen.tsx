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
import { Sidebar } from '../../shared/Sidebar';

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
    <main className="zync-dashboard-main h-screen overflow-hidden text-text-primary">
      <button
        type="button"
        onClick={() => setIsMobileSidebarOpen(true)}
        className="fixed left-4 top-4 z-40 inline-flex h-11 w-11 items-center justify-center rounded-full bg-bg-card shadow-lg text-text-primary lg:hidden"
        aria-label="Mở thanh điều hướng"
      >
        <span className="text-lg leading-none">☰</span>
      </button>

      <Sidebar 
        data={data}
        activeNavId={selectedNavId}
        onNavSelect={handleSelectNav}
        isMobileSidebarOpen={isMobileSidebarOpen}
        onMobileSidebarClose={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex h-screen overflow-hidden gap-3 p-3 lg:gap-5 lg:p-5">
        {/* Desktop Sidebar spacing handled by Sidebar component rendering fixed/relative or we need a spacer? The Sidebar component has 'hidden ... lg:flex' but it's absolute? Wait, the desktop sidebar in the new Sidebar component is NOT fixed, it relies on flex layout. We need to wrap it correctly or pass it inside the flex layout. */}
        {/* Since Sidebar component returns Fragments containing the mobile overlay and desktop aside, we just place it here inside the flex container. Wait! The mobile overlay is fixed, so it can be anywhere. The desktop aside is part of the flex layout. */}

        <section className={`${sectionClassName} bg-bg-primary rounded-3xl border border-border shadow-md`}>
          {selectedNavId === 'home' && (
            <header className="bg-bg-card relative z-20 flex flex-wrap items-center justify-between gap-4 rounded-2xl px-4 py-3 border-b border-border-light shadow-sm !overflow-visible">
              <h1 className="font-ui-title text-[clamp(1.3rem,2.3vw,2rem)] text-text-primary">{data.greeting}</h1>
              <div className="flex items-center gap-3">
                {/* Search bar removed from Trang chủ as requested */}

                {notificationSlot ?? (
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-hover text-text-secondary transition hover:bg-border-light hover:text-text-primary">
                    <DashboardIcon name="bell" className="h-4 w-4" />
                  </button>
                )}
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-bg-hover text-text-secondary transition hover:bg-border-light hover:text-text-primary">
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

              <section className="bg-bg-card border border-border-light mt-8 shrink-0 rounded-3xl p-4 sm:p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-ui-title text-[clamp(1.35rem,2.3vw,2rem)] text-text-primary">{data.activityTitle}</h2>
                  <Link href="/friends" className="font-ui-title text-sm text-accent transition hover:text-accent-hover">
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

