'use client';

import Link from 'next/link';
import { DashboardStoryItemRow } from '@/components/home-dashboard/molecules/dashboard-story-item';
import { DashboardStatCard } from '@/components/home-dashboard/molecules/dashboard-stat-card';
import { DashboardActivityItemRow } from '@/components/home-dashboard/molecules/dashboard-activity-item';
import { DASHBOARD_HOME_MOCK_DATA } from '@/components/home-dashboard/mock-data';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';

export default function HomePage() {
  const { data, onSelectConversation } = useHomeDashboard();
  const mockData = DASHBOARD_HOME_MOCK_DATA;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="border-b border-border-light px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-ui-meta text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">Trung tâm</p>
            <h1 className="font-ui-title mt-1.5 text-2xl text-text-primary">{mockData.greeting}</h1>
            <p className="font-ui-content mt-1 text-sm text-text-secondary">Chúc bạn một ngày làm việc hiệu quả</p>
          </div>
          <span className="zync-soft-badge">
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Trực tuyến
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20 sm:px-6 sm:py-6">
        <div className="w-full space-y-6">
          {/* Stories */}
          {mockData.stories.length > 0 && (
            <div className="shrink-0 rounded-[1.6rem] p-3 zync-soft-card-muted">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {mockData.stories.map((item) => (
                  <DashboardStoryItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid shrink-0 grid-cols-3 gap-3 sm:gap-4">
            {mockData.stats.map((item) => (
              <DashboardStatCard key={item.id} item={item} />
            ))}
          </div>

          {/* Activity Feed */}
          <section className="shrink-0 rounded-[1.8rem] p-4 shadow-sm zync-soft-card-muted sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-light pb-3">
              <h2 className="font-ui-title text-lg text-text-primary">{mockData.activityTitle}</h2>
              {mockData.activities.length > 0 && (
                <Link href="/friends" className="zync-soft-badge text-sm hover:text-text-primary">
                  {mockData.activityCtaLabel}
                </Link>
              )}
            </div>

            {mockData.activities.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-hover">
                  <svg className="h-6 w-6 text-text-tertiary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <div>
                  <p className="font-ui-title text-sm text-text-primary">Chưa có hoạt động nào</p>
                  <p className="font-ui-content mt-1 text-xs text-text-secondary">
                    Bắt đầu trò chuyện để xem tin nhắn tại đây
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {mockData.activities.map((item) => (
                  <DashboardActivityItemRow
                    key={item.id}
                    item={item}
                    onClick={(clicked) => {
                      if (clicked.conversationId) {
                        onSelectConversation(clicked.conversationId);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          <div className="h-10 shrink-0" tabIndex={-1} />
        </div>
      </div>
    </div>
  );
}
