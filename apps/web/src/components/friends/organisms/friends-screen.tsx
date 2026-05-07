'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Bell, CheckCircle2, Users, X } from 'lucide-react';
import { FriendsTabNavigation } from '../atoms/friends-tab-navigation';
import { FriendCard } from '../molecules/friend-card';
import { RequestList } from '../molecules/request-list';
import { SearchPanel } from '../molecules/search-panel';
import type { FriendUser } from '@/services/friends';

interface FriendsScreenProps {
  friends: FriendUser[];
  incomingRequests: Array<{
    requestId: string;
    userId: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
    createdAt: string;
  }>;
  outgoingRequests: Array<{
    requestId: string;
    userId: string;
    displayName: string;
    username?: string;
    avatarUrl?: string;
    createdAt: string;
  }>;
  searchKeyword: string;
  searchResults: FriendUser[];
  pendingTotal: number;
  nextCursor: string | null;
  isLoading: boolean;
  isLoadingMore?: boolean;
  infoMessage: string | null;
  errorMessage: string | null;
  onSearchKeywordChange: (value: string) => void;
  onSearch: () => Promise<void>;
  onClearSearch: () => void;
  onLoadMoreFriends: () => Promise<void>;
  onSendRequest: (toUserId: string) => Promise<void>;
  onAcceptRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onCancelRequest: (requestId: string) => Promise<void>;
  onUnfriend: (friendId: string) => Promise<void>;
  onBlock: (userId: string) => Promise<void>;
  onUnblock: (userId: string) => Promise<void>;
}

type TabId = 'all' | 'requests' | 'search';

export function FriendsScreen({
  friends,
  incomingRequests,
  outgoingRequests,
  searchKeyword,
  searchResults,
  pendingTotal,
  nextCursor,
  isLoading,
  isLoadingMore = false,
  infoMessage,
  errorMessage,
  onSearchKeywordChange,
  onSearch,
  onClearSearch,
  onLoadMoreFriends,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onCancelRequest,
  onUnfriend,
  onBlock,
  onUnblock,
}: FriendsScreenProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [showToast, setShowToast] = useState(true);

  // Sync tab from URL on mount
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam === 'requests') {
      setActiveTab('requests');
    } else if (tabParam === 'search') {
      setActiveTab('search');
    }
  }, [searchParams]);

  // Auto-hide toast messages
  useEffect(() => {
    if (infoMessage || errorMessage) {
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    }
  }, [infoMessage, errorMessage]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`/friends?${params.toString()}`, { scroll: false });
  };

  // Handle message action - navigate to chat
  const handleMessage = (friendId: string) => {
    router.push(`/chat?conversation=${friendId}`);
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <header className="border-b border-border-light bg-[var(--surface-card)]/80 px-4 py-4 backdrop-blur-md sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Top row: Title + Notifications */}
          <div className="flex items-start justify-between lg:flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent)] to-emerald-400 shadow-md shadow-[var(--accent)]/20">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="font-ui-title text-xl text-[var(--text-primary)] sm:text-2xl">
                  Bạn bè
                </h1>
                <p className="font-ui-meta text-xs text-[var(--text-tertiary)] sm:text-sm">
                  {friends.length} kết nối
                  {pendingTotal > 0 && ` · ${pendingTotal} lời mời chờ`}
                </p>
              </div>
            </div>

            {/* Notification Badge */}
            {pendingTotal > 0 && (
              <button
                type="button"
                onClick={() => handleTabChange('requests')}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[var(--surface-glass)] shadow-sm transition-all hover:border-[var(--accent)]/30 hover:shadow-md lg:hidden"
                aria-label={`${pendingTotal} lời mời kết bạn`}
              >
                <Bell className="h-5 w-5 text-[var(--accent)]" />
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white shadow-sm">
                  {pendingTotal > 9 ? '9+' : pendingTotal}
                </span>
              </button>
            )}
          </div>

          {/* Tab Navigation */}
          <FriendsTabNavigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            pendingCount={pendingTotal}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* All Friends Tab */}
          {activeTab === 'all' && (
            <div className="space-y-4">
              {friends.length === 0 && !isLoading ? (
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-[var(--surface-muted)]/50 py-16 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-hover)]">
                    <Users className="h-8 w-8 text-[var(--text-tertiary)]" />
                  </div>
                  <div>
                    <p className="font-ui-title text-base text-[var(--text-primary)]">
                      Chưa có bạn bè nào
                    </p>
                    <p className="font-ui-content mt-1 text-sm text-[var(--text-secondary)]">
                      Tìm kiếm và kết nối với mọi người
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange('search')}
                    className="zync-soft-button mt-2 px-5 py-2.5 text-sm"
                  >
                    Tìm bạn ngay
                  </button>
                </div>
              ) : (
                <>
                  {/* Friends Grid */}
                  {isLoading ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                        <div
                          key={i}
                          className="animate-pulse rounded-2xl border border-border bg-[var(--surface-muted)]/50 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="h-14 w-14 rounded-full bg-[var(--bg-hover)]" />
                            <div className="flex-1 space-y-2">
                              <div className="h-4 w-24 rounded bg-[var(--bg-hover)]" />
                              <div className="h-3 w-16 rounded bg-[var(--bg-hover)]" />
                            </div>
                          </div>
                          <div className="mt-4 h-9 w-full rounded-full bg-[var(--bg-hover)]" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                      {friends.map((friend, index) => (
                        <div
                          key={friend.id}
                          className="zync-reveal-up"
                          style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                        >
                          <FriendCard
                            friend={friend}
                            onUnfriend={onUnfriend}
                            onBlock={onBlock}
                            isLoading={isLoadingMore}
                            onMessage={handleMessage}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Load More */}
                  {nextCursor && !isLoading && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => { void onLoadMoreFriends(); }}
                        disabled={isLoadingMore}
                        className="zync-soft-button-secondary flex items-center gap-2 px-6 py-2.5 text-sm"
                      >
                        {isLoadingMore ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--text-tertiary)]/30 border-t-[var(--text-tertiary)]" />
                            Đang tải...
                          </>
                        ) : (
                          'Tải thêm bạn bè'
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <h2 className="font-ui-title text-lg text-[var(--text-primary)]">Lời mời kết bạn</h2>
                {pendingTotal > 0 && (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--accent)]/10 px-2 text-xs font-semibold text-[var(--accent)]">
                    {pendingTotal}
                  </span>
                )}
              </div>

              <RequestList
                incomingRequests={incomingRequests}
                outgoingRequests={outgoingRequests}
                isLoading={isLoading}
                onAcceptRequest={onAcceptRequest}
                onRejectRequest={onRejectRequest}
                onCancelRequest={onCancelRequest}
              />
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-ui-title text-lg text-[var(--text-primary)]">Tìm bạn mới</h2>
                <p className="font-ui-content mt-1 text-sm text-[var(--text-secondary)]">
                  Tìm kiếm người quen để kết nối
                </p>
              </div>

              <SearchPanel
                searchKeyword={searchKeyword}
                searchResults={searchResults}
                isLoading={isLoading}
                onSearchKeywordChange={onSearchKeywordChange}
                onSearch={onSearch}
                onClearSearch={onClearSearch}
                onSendRequest={onSendRequest}
              />
            </div>
          )}

          {/* Feedback Messages */}
          {infoMessage && showToast && (
            <div className="animate-toast-slide-in flex items-center gap-3 rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-3 shadow-sm">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--accent)]" />
              <p className="font-ui-content flex-1 text-sm text-[var(--success-text)]">
                {infoMessage}
              </p>
              <button
                type="button"
                onClick={() => setShowToast(false)}
                className="shrink-0 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {errorMessage && showToast && (
            <div className="animate-toast-slide-in flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 shadow-sm">
              <X className="h-5 w-5 shrink-0 text-red-400" />
              <p className="font-ui-content flex-1 text-sm text-red-400">{errorMessage}</p>
              <button
                type="button"
                onClick={() => setShowToast(false)}
                className="shrink-0 text-red-400/70 transition-colors hover:text-red-400"
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
