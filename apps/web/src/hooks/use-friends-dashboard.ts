'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getSocket } from '@/services/socket';
import { getAccessToken } from '@/utils/auth-token';
import {
  acceptFriendRequest,
  blockUser,
  fetchFriendRequests,
  fetchFriends,
  rejectFriendRequest,
  searchFriendCandidates,
  sendFriendRequest,
  unfriend,
  unblockUser,
  type FriendRequestItem,
  type FriendUser,
} from '@/services/friends';

export function useFriendsDashboard() {
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const [friendsData, requestData] = await Promise.all([
        fetchFriends(),
        fetchFriendRequests(),
      ]);

      setFriends(friendsData.friends);
      setNextCursor(friendsData.nextCursor);
      setIncomingRequests(requestData.incoming);
      setOutgoingRequests(requestData.outgoing);
    } catch {
      setErrorMessage('Không thể tải dữ liệu bạn bè. Vui lòng đăng nhập lại và thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadMoreFriends = useCallback(async () => {
    if (!nextCursor || isLoading) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchFriends(nextCursor);
      setFriends((prev) => [...prev, ...data.friends]);
      setNextCursor(data.nextCursor);
    } catch {
      setErrorMessage('Không thể tải thêm danh sách bạn bè.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, nextCursor]);

  const onSearch = useCallback(async () => {
    const keyword = searchKeyword.trim();
    if (keyword.length < 2) {
      setErrorMessage('Vui lòng nhập tối thiểu 2 ký tự để tìm kiếm.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const results = await searchFriendCandidates(keyword);
      setSearchResults(results);
    } catch {
      setErrorMessage('Không thể tìm kiếm người dùng.');
    } finally {
      setIsLoading(false);
    }
  }, [searchKeyword]);

  const onSendRequest = useCallback(async (toUserId: string) => {
    try {
      setIsLoading(true);
      await sendFriendRequest(toUserId);
      setInfoMessage('Đã gửi lời mời kết bạn.');
      await loadData();
    } catch {
      setErrorMessage('Gửi lời mời kết bạn thất bại.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  const onAcceptRequest = useCallback(async (requestId: string) => {
    try {
      setIsLoading(true);
      await acceptFriendRequest(requestId);
      setInfoMessage('Đã chấp nhận lời mời kết bạn.');
      await loadData();
    } catch {
      setErrorMessage('Không thể chấp nhận lời mời.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  const onRejectRequest = useCallback(async (requestId: string) => {
    try {
      setIsLoading(true);
      await rejectFriendRequest(requestId);
      setInfoMessage('Đã từ chối lời mời kết bạn.');
      await loadData();
    } catch {
      setErrorMessage('Không thể từ chối lời mời.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  const onUnfriend = useCallback(async (friendId: string) => {
    try {
      setIsLoading(true);
      await unfriend(friendId);
      setInfoMessage('Đã hủy kết bạn thành công.');
      await loadData();
    } catch {
      setErrorMessage('Không thể hủy kết bạn.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  const onBlock = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      await blockUser(userId);
      setInfoMessage('Đã chặn người dùng.');
      await loadData();
    } catch {
      setErrorMessage('Không thể chặn người dùng.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  const onUnblock = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      await unblockUser(userId);
      setInfoMessage('Đã bỏ chặn người dùng.');
      await loadData();
    } catch {
      setErrorMessage('Không thể bỏ chặn người dùng.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData]);

  const pendingTotal = useMemo(() => incomingRequests.length + outgoingRequests.length, [incomingRequests, outgoingRequests]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = getSocket(token);

    const handleNewNotification = (notification: { type: string }) => {
      if (notification.type === 'friend_request' || notification.type === 'friend_accepted') {
        void loadData();
      }
    };

    socket.on('new_notification', handleNewNotification);

    return () => {
      socket.off('new_notification', handleNewNotification);
    };
  }, [loadData]);

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    searchKeyword,
    searchResults,
    pendingTotal,
    nextCursor,
    isLoading,
    infoMessage,
    errorMessage,
    setSearchKeyword,
    loadData,
    loadMoreFriends,
    onSearch,
    onSendRequest,
    onAcceptRequest,
    onRejectRequest,
    onUnfriend,
    onBlock,
    onUnblock,
  };
}
