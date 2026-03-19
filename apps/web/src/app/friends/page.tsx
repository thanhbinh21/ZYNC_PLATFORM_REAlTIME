'use client';

import { useEffect } from 'react';
import { FriendsScreen } from '@/components/friends/organisms/friends-screen';
import { useFriendsDashboard } from '@/hooks/use-friends-dashboard';

export default function FriendsPage() {
  const dashboard = useFriendsDashboard();
  const { loadData } = dashboard;

  useEffect(() => {
    void loadData();
  }, [loadData]);

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
