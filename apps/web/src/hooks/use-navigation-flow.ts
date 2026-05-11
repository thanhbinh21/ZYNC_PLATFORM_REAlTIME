'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/services/api';
import { sendFriendRequest as apiSendFriendRequest } from '@/services/friends';

export interface UserProfileSummary {
  _id: string;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  friendCount?: number;
  mutualFriends?: number;
  isFriend?: boolean;
  createdAt?: string;
}

export interface ConversationRef {
  conversationId: string;
  isNew: boolean;
}

interface UseNavigationFlowReturn {
  // Chat navigation
  navigateToChat: (userId: string) => Promise<string | null>;
  navigateToChatByConversation: (conversationId: string) => void;

  // Friend actions
  sendFriendRequest: (userId: string) => Promise<boolean>;

  // Profile modal state
  profileModalUserId: string | null;
  profileModalOpen: boolean;
  openProfileModal: (userId: string) => void;
  closeProfileModal: () => void;

  // Profile data
  profileModalUser: UserProfileSummary | null;
  profileModalLoading: boolean;

  // Loading states
  chatLoading: boolean;
  friendRequestLoading: boolean;

  // Explore skills
  navigateToExploreWithSkills: (skills: string[]) => void;
}

/**
 * Hook tập trung xử lý navigation logic phức tạp cho luồng nghiệp vụ liên kết.
 * Dùng chung cho Friends → Chat, Community → Profile → Chat, Explore → Friends.
 */
export function useNavigationFlow(): UseNavigationFlowReturn {
  const router = useRouter();

  // Chat loading state
  const [chatLoading, setChatLoading] = useState(false);

  // Friend request loading
  const [friendRequestLoading, setFriendRequestLoading] = useState(false);

  // Profile modal state
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileModalUser, setProfileModalUser] = useState<UserProfileSummary | null>(null);
  const [profileModalLoading, setProfileModalLoading] = useState(false);

  /**
   * Di chuyển đến chat với người dùng cụ thể.
   * 1. Gọi POST /api/conversations/direct với targetUserId để tìm hoặc tạo conversation.
   * 2. Navigate sang /chat?conversationId=...
   * 3. Trả về conversationId nếu thành công, null nếu thất bại.
   */
  const navigateToChat = useCallback(async (userId: string): Promise<string | null> => {
    setChatLoading(true);
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data?: { _id: string };
        error?: string;
      }>('/api/conversations/direct', { targetUserId: userId });

      if (data.success && data.data?._id) {
        const conversationId = data.data._id;
        router.push(`/chat?conversationId=${encodeURIComponent(conversationId)}`);
        return conversationId;
      }
      return null;
    } catch (err) {
      console.error('[useNavigationFlow] navigateToChat failed:', err);
      return null;
    } finally {
      setChatLoading(false);
    }
  }, [router]);

  /**
   * Di chuyển trực tiếp đến conversation đã biết conversationId.
   */
  const navigateToChatByConversation = useCallback((conversationId: string) => {
    router.push(`/chat?conversationId=${encodeURIComponent(conversationId)}`);
  }, [router]);

  /**
   * Gửi lời mời kết bạn.
   * Trả về true nếu thành công.
   */
  const sendFriendRequest = useCallback(async (userId: string): Promise<boolean> => {
    setFriendRequestLoading(true);
    try {
      await apiSendFriendRequest(userId);
      return true;
    } catch (err) {
      console.error('[useNavigationFlow] sendFriendRequest failed:', err);
      return false;
    } finally {
      setFriendRequestLoading(false);
    }
  }, []);

  /**
   * Mở profile modal cho userId.
   * Fetch thông tin user và cập nhật state.
   */
  const openProfileModal = useCallback(async (userId: string) => {
    setProfileModalUserId(userId);
    setProfileModalOpen(true);
    setProfileModalUser(null);
    setProfileModalLoading(true);

    try {
      const { data } = await apiClient.get<{
        success: boolean;
        data?: UserProfileSummary;
      }>(`/api/users/${userId}`);

      if (data.success && data.data) {
        setProfileModalUser(data.data);
      }
    } catch (err) {
      console.error('[useNavigationFlow] openProfileModal fetch failed:', err);
    } finally {
      setProfileModalLoading(false);
    }
  }, []);

  /**
   * Đóng profile modal và reset state.
   */
  const closeProfileModal = useCallback(() => {
    setProfileModalOpen(false);
    // Giữ lại userId gần nhất để tránh flash khi mở lại
    setTimeout(() => {
      setProfileModalUserId(null);
      setProfileModalUser(null);
    }, 300);
  }, []);

  /**
   * Di chuyển đến trang Explore với danh sách skills được lọc.
   */
  const navigateToExploreWithSkills = useCallback((skills: string[]) => {
    const query = skills.join(',');
    router.push(`/explore?skills=${encodeURIComponent(query)}`);
  }, [router]);

  return {
    navigateToChat,
    navigateToChatByConversation,
    sendFriendRequest,
    profileModalUserId,
    profileModalOpen,
    openProfileModal,
    closeProfileModal,
    profileModalUser,
    profileModalLoading,
    chatLoading,
    friendRequestLoading,
    navigateToExploreWithSkills,
  };
}
