'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [friends, setFriends] = useState<FriendUser[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestItem[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestItem[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Debounce timer for search
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Hiển thị thông báo thành công
   */
  const showInfo = useCallback((message: string) => {
    setInfoMessage(message);
    setErrorMessage(null);
    // Auto-clear after 4 seconds
    setTimeout(() => setInfoMessage(null), 4000);
  }, []);

  /**
   * Hiển thị thông báo lỗi
   */
  const showError = useCallback((message: string) => {
    setErrorMessage(message);
    setInfoMessage(null);
    // Auto-clear after 4 seconds
    setTimeout(() => setErrorMessage(null), 4000);
  }, []);

  /**
   * Tải toàn bộ dữ liệu bạn bè
   */
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
      showError('Không thể tải dữ liệu bạn bè. Vui lòng đăng nhập lại và thử lại.');
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  /**
   * Tải thêm bạn bè (phân trang)
   */
  const loadMoreFriends = useCallback(async () => {
    if (!nextCursor || isLoading || isLoadingMore) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const data = await fetchFriends(nextCursor);
      setFriends((prev) => [...prev, ...data.friends]);
      setNextCursor(data.nextCursor);
    } catch {
      showError('Không thể tải thêm danh sách bạn bè.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, nextCursor, showError]);

  /**
   * Tìm kiếm bạn bè với debounce
   */
  const onSearch = useCallback(async () => {
    // Clear previous debounce
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    const keyword = searchKeyword.trim();
    if (keyword.length < 2) {
      showError('Vui lòng nhập tối thiểu 2 ký tự để tìm kiếm.');
      return;
    }

    // Debounce search
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        const results = await searchFriendCandidates(keyword);
        setSearchResults(results);
      } catch {
        showError('Không thể tìm kiếm người dùng.');
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, [searchKeyword, showError]);

  /**
   * Gửi lời mời kết bạn
   */
  const onSendRequest = useCallback(async (toUserId: string) => {
    try {
      setIsLoading(true);
      await sendFriendRequest(toUserId);
      showInfo('Đã gửi lời mời kết bạn.');
      await loadData();
    } catch {
      showError('Gửi lời mời kết bạn thất bại.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showInfo, showError]);

  /**
   * Chấp nhận lời mời kết bạn
   */
  const onAcceptRequest = useCallback(async (requestId: string) => {
    try {
      setIsLoading(true);
      await acceptFriendRequest(requestId);
      showInfo('Đã chấp nhận lời mời kết bạn.');
      await loadData();
    } catch {
      showError('Không thể chấp nhận lời mời.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showInfo, showError]);

  /**
   * Từ chối lời mời kết bạn
   */
  const onRejectRequest = useCallback(async (requestId: string) => {
    try {
      setIsLoading(true);
      await rejectFriendRequest(requestId);
      showInfo('Đã từ chối lời mời kết bạn.');
      await loadData();
    } catch {
      showError('Không thể từ chối lời mời.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showInfo, showError]);

  /**
   * Thu hồi lời mời đã gửi
   */
  const onCancelRequest = useCallback(async (requestId: string) => {
    try {
      setIsLoading(true);
      await rejectFriendRequest(requestId);
      showInfo('Đã thu hồi lời mời kết bạn.');
      await loadData();
    } catch {
      showError('Không thể thu hồi lời mời.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showInfo, showError]);

  /**
   * Hủy kết bạn
   */
  const onUnfriend = useCallback(async (friendId: string) => {
    try {
      setIsLoading(true);
      await unfriend(friendId);
      showInfo('Đã hủy kết bạn thành công.');
      await loadData();
    } catch {
      showError('Không thể hủy kết bạn.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showInfo, showError]);

  /**
   * Chặn người dùng
   */
  const onBlock = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      await blockUser(userId);
      showInfo('Đã chặn người dùng.');
      await loadData();
    } catch {
      showError('Không thể chặn người dùng.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showInfo, showError]);

  /**
   * Bỏ chặn người dùng
   */
  const onUnblock = useCallback(async (userId: string) => {
    try {
      setIsLoading(true);
      await unblockUser(userId);
      showInfo('Đã bỏ chặn người dùng.');
      await loadData();
    } catch {
      showError('Không thể bỏ chặn người dùng.');
    } finally {
      setIsLoading(false);
    }
  }, [loadData, showInfo, showError]);

  /**
   * Xóa tìm kiếm
   */
  const onClearSearch = useCallback(() => {
    setSearchKeyword('');
    setSearchResults([]);
    setErrorMessage(null);
  }, []);

  /**
   * Tổng số lời mời chờ
   */
  const pendingTotal = useMemo(
    () => incomingRequests.length + outgoingRequests.length,
    [incomingRequests, outgoingRequests]
  );

  /**
   * Lắng nghe thông báo real-time từ Socket.IO
   */
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

    const handlePresenceChanged = (payload: { userId: string; status: 'online' | 'offline'; hidden?: boolean }) => {
      setFriends((prev) => prev.map((friend) => (
        friend.id === payload.userId
          ? { ...friend, status: payload.hidden ? undefined : payload.status }
          : friend
      )));
    };

    socket.on('presence_changed', handlePresenceChanged);

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('presence_changed', handlePresenceChanged);
    };
  }, [loadData]);

  /**
   * Cleanup debounce timer on unmount
   */
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  /**
   * Load dữ liệu ban đầu
   */
  useEffect(() => {
    void loadData();
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
    isLoadingMore,
    infoMessage,
    errorMessage,
    setSearchKeyword,
    loadData,
    loadMoreFriends,
    onSearch,
    onClearSearch,
    onSendRequest,
    onAcceptRequest,
    onRejectRequest,
    onCancelRequest,
    onUnfriend,
    onBlock,
    onUnblock,
  };
}
