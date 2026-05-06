'use client';

import { Suspense } from 'react';
import { FriendsScreen } from '@/components/friends/organisms/friends-screen';
import { useFriendsDashboard } from '@/hooks/use-friends-dashboard';
import { PageLoading } from '@/components/shared/page-loading';

function FriendsPageContent() {
  const dashboard = useFriendsDashboard();
  const { loadData } = dashboard;

  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  dashboard.setSearchKeyword; // ensure all required props exist

  return (
    <FriendsScreen
      friends={dashboard.friends}
      incomingRequests={dashboard.incomingRequests}
      outgoingRequests={dashboard.outgoingRequests}
      searchKeyword={dashboard.searchKeyword}
      searchResults={dashboard.searchResults}
      pendingTotal={dashboard.pendingTotal}
      nextCursor={dashboard.nextCursor}
      isLoading={dashboard.isLoading}
      infoMessage={dashboard.infoMessage}
      errorMessage={dashboard.errorMessage}
      onSearchKeywordChange={dashboard.setSearchKeyword}
      onSearch={dashboard.onSearch}
      onLoadMoreFriends={dashboard.loadMoreFriends}
      onSendRequest={dashboard.onSendRequest}
      onAcceptRequest={dashboard.onAcceptRequest}
      onRejectRequest={dashboard.onRejectRequest}
      onUnfriend={dashboard.onUnfriend}
      onBlock={dashboard.onBlock}
      onUnblock={dashboard.onUnblock}
    />
  );
}

export default function FriendsPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <FriendsPageContent />
    </Suspense>
  );
}
