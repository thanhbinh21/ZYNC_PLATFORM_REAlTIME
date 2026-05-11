'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import React, { Suspense } from 'react';
import { DashboardStoryItemRow } from '@/components/home-dashboard/molecules/dashboard-story-item';
import { DashboardStatCard } from '@/components/home-dashboard/molecules/dashboard-stat-card';
import { DashboardActivityItemRow } from '@/components/home-dashboard/molecules/dashboard-activity-item';
import { DashboardNotificationItemRow } from '@/components/home-dashboard/molecules/dashboard-notification-item';
import { DashboardFriendActivityItemRow } from '@/components/home-dashboard/molecules/dashboard-friend-activity-item';
import { DASHBOARD_HOME_MOCK_DATA } from '@/components/home-dashboard/mock-data';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { PageLoading } from '@/components/shared/page-loading';
import { ZyncPageTransition } from '@/components/shared/ZyncPageTransition';
import { 
  Bell as LucideBell, 
  Users as LucideUsers, 
  ArrowRight as LucideArrowRight, 
  MessageSquare as LucideMessageSquare, 
  UserPlus as LucideUserPlus, 
  FolderOpen as LucideFolderOpen 
} from 'lucide-react';

const Bell = LucideBell as any;
const Users = LucideUsers as any;
const ArrowRight = LucideArrowRight as any;
const MessageSquare = LucideMessageSquare as any;
const UserPlus = LucideUserPlus as any;
const FolderOpen = LucideFolderOpen as any;

function HomePageContent(): React.JSX.Element {
  const router = useRouter();
  const { data, onSelectConversation } = useHomeDashboard();
  const mockData = DASHBOARD_HOME_MOCK_DATA;

/**
 * Xử lý click vào activity item - điều hướng đến chat với conversation được chọn
 */
const handleActivityClick = (item: typeof data.activities[0]) => {
  if (item.conversationId) {
    // Đi đến chat và select conversation
    router.push(`/chat?conversation=${item.conversationId}`);
  }
};

/**
 * Xử lý click vào notification - điều hướng đến đúng nội dung
 */
const handleNotificationClick = (item: typeof data.notifications[0]) => {
  switch (item.type) {
    case 'new_message':
      // Đi đến đúng conversation và highlight tin nhắn mới nhất
      if (item.conversationId) {
        router.push(`/chat?conversation=${item.conversationId}&highlight=new`);
      } else {
        router.push('/chat');
      }
      break;
    case 'friend_request':
    case 'friend_accepted':
      // Đi đến trang bạn bè - tab lời mời
      router.push('/friends?tab=requests');
      break;
    case 'group_invite':
      // Đi đến trang cộng đồng - phần nhóm
      router.push('/community?tab=invites');
      break;
    case 'story_reaction':
    case 'story_reply':
      // Đi đến stories - highlight story của người gửi
      if (item.fromUserId) {
        router.push(`/stories?user=${item.fromUserId}`);
      } else {
        router.push('/stories');
      }
      break;
    default:
      router.push('/notifications');
  }
};

/**
 * Xử lý click vào friend activity - điều hướng đến bạn bè cụ thể
 */
const handleFriendActivityClick = (item: typeof data.friendActivities[0]) => {
  // Đi đến trang bạn bè và highlight người đó
  router.push(`/friends?user=${item.userId}`);
};

  /**
   * Xử lý click vào stat card
   */
  const handleStatClick = (statId: string) => {
    switch (statId) {
      case 'stat-1': // Tin nhắn mới
        router.push('/chat');
        break;
      case 'stat-2': // Lời mời kết bạn
        router.push('/friends');
        break;
      case 'stat-3': // Nhóm
        router.push('/community');
        break;
    }
  };

  return (
    <ZyncPageTransition>
    <div className="flex h-full w-full flex-col overflow-hidden">
      <header className="border-b border-border-light px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-ui-meta text-[0.72rem] uppercase tracking-[0.18em] text-text-tertiary">Trung tâm</p>
            <h1 className="font-ui-title mt-1.5 text-2xl text-text-primary">{data.greeting}</h1>
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
          {data.stories.length > 0 && (
            <div className="shrink-0 rounded-[1.6rem] p-3 zync-soft-card-muted">
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {data.stories.map((item) => (
                  <DashboardStoryItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Stats Grid - Clickable */}
          <div className="grid shrink-0 grid-cols-3 gap-3 sm:grid-cols-3">
            {data.stats.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleStatClick(item.id)}
                className="w-full text-left"
              >
                <DashboardStatCard item={item} />
              </button>
            ))}
          </div>

          {/* Main Content: 2-column layout on desktop */}
          <div className="grid shrink-0 gap-4 lg:grid-cols-2">
            {/* Left Column: Activities + Notifications */}
            <div className="space-y-4">
              {/* Activity Feed */}
              <section className="shrink-0 rounded-[1.8rem] p-4 shadow-sm zync-soft-card-muted sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-light pb-3">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-accent" />
                    <h2 className="font-ui-title text-lg text-text-primary">{data.activityTitle}</h2>
                  </div>
                  {data.activities.length > 0 && (
                    <Link href="/chat" className="zync-soft-badge text-sm hover:text-text-primary flex items-center gap-1">
                      {data.activityCtaLabel}
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {data.activities.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-hover">
                      <MessageSquare className="h-6 w-6 text-text-tertiary" />
                    </div>
                    <div>
                      <p className="font-ui-title text-sm text-text-primary">Chưa có hoạt động nào</p>
                      <p className="font-ui-content mt-1 text-xs text-text-secondary">
                        Bắt đầu trò chuyện để xem tin nhắn tại đây
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/chat')}
                      className="zync-soft-button mt-2 px-4 py-2 text-sm"
                    >
                      Bắt đầu chat
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.activities.map((activityItem) => (
                      <DashboardActivityItemRow
                        key={activityItem.id}
                        item={activityItem}
                        onClick={() => handleActivityClick(activityItem)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Notifications */}
              <section className="shrink-0 rounded-[1.8rem] p-4 shadow-sm zync-soft-card-muted sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-light pb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-accent" />
                    <h2 className="font-ui-title text-lg text-text-primary">{data.notificationsTitle}</h2>
                    {data.unreadNotificationCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-semibold text-white">
                        {data.unreadNotificationCount > 99 ? '99+' : data.unreadNotificationCount}
                      </span>
                    )}
                  </div>
                  {data.notifications.length > 0 && (
                    <Link href="/notifications" className="zync-soft-badge text-sm hover:text-text-primary flex items-center gap-1">
                      Xem tất cả
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>

                {data.notifications.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-hover">
                      <Bell className="h-6 w-6 text-text-tertiary" />
                    </div>
                    <div>
                      <p className="font-ui-title text-sm text-text-primary">Không có thông báo mới</p>
                      <p className="font-ui-content mt-1 text-xs text-text-secondary">
                        Bạn sẽ nhận thông báo khi có tin nhắn hoặc hoạt động mới
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.notifications.slice(0, 5).map((item) => (
                      <DashboardNotificationItemRow
                        key={item.id}
                        item={item}
                        onClick={() => handleNotificationClick(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Right Column: Friend Activities */}
            <div className="space-y-4">
              <section className="shrink-0 rounded-[1.8rem] p-4 shadow-sm zync-soft-card-muted sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-3 border-b border-border-light pb-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    <h2 className="font-ui-title text-lg text-text-primary">{data.friendActivityTitle}</h2>
                  </div>
                  <Link href="/friends" className="zync-soft-badge text-sm hover:text-text-primary flex items-center gap-1">
                    Bạn bè
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {data.friendActivities.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-hover">
                      <Users className="h-6 w-6 text-text-tertiary" />
                    </div>
                    <div>
                      <p className="font-ui-title text-sm text-text-primary">Không có hoạt động bạn bè</p>
                      <p className="font-ui-content mt-1 text-xs text-text-secondary">
                        Kết bạn để xem hoạt động của họ tại đây
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/friends')}
                      className="zync-soft-button mt-2 px-4 py-2 text-sm"
                    >
                      Tìm bạn bè
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {data.friendActivities.map((item) => (
                      <DashboardFriendActivityItemRow
                        key={item.id}
                        item={item}
                        onClick={() => handleFriendActivityClick(item)}
                      />
                    ))}
                  </div>
                )}
              </section>

              {/* Quick Stats Card - Clickable */}
              <section className="shrink-0 rounded-[1.8rem] p-5 shadow-sm zync-soft-card sm:p-6">
                <h3 className="font-ui-title text-base text-text-primary mb-4">Tổng quan hôm nay</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => router.push('/chat')}
                    className="rounded-[1.2rem] border border-border bg-white/50 p-4 text-center transition hover:border-accent hover:bg-accent-light/20 active:scale-[0.98]"
                  >
                    <p className="font-ui-brand text-2xl text-accent-strong">{data.stats[0]?.value || '00'}</p>
                    <p className="font-ui-meta text-xs text-text-tertiary mt-1">Tin nhắn mới</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/friends')}
                    className="rounded-[1.2rem] border border-border bg-white/50 p-4 text-center transition hover:border-accent hover:bg-accent-light/20 active:scale-[0.98]"
                  >
                    <p className="font-ui-brand text-2xl text-accent-strong">{data.stats[1]?.value || '00'}</p>
                    <p className="font-ui-meta text-xs text-text-tertiary mt-1">Lời mời kết bạn</p>
                  </button>
                </div>
              </section>

              {/* Quick Actions */}
              <section className="shrink-0 rounded-[1.8rem] p-4 shadow-sm zync-soft-card-muted sm:p-5">
                <h3 className="font-ui-title text-sm text-text-primary mb-3">Thao tác nhanh</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/chat')}
                    className="zync-soft-button-secondary flex items-center gap-2 px-4 py-2.5 text-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Tin nhắn mới
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/friends')}
                    className="zync-soft-button-secondary flex items-center gap-2 px-4 py-2.5 text-sm"
                  >
                    <UserPlus className="h-4 w-4" />
                    Thêm bạn
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push('/community')}
                    className="zync-soft-button-secondary flex items-center gap-2 px-4 py-2.5 text-sm"
                  >
                    <FolderOpen className="h-4 w-4" />
                    Nhóm mới
                  </button>
                </div>
              </section>
            </div>
          </div>

          <div className="h-10 shrink-0" tabIndex={-1} />
        </div>
      </div>
    </div>
    </ZyncPageTransition>
  );
}

export default function HomePage(): React.JSX.Element {
  return (
    <Suspense fallback={<PageLoading variant="home" mode="panel" />}>
      <HomePageContent />
    </Suspense>
  );
}
