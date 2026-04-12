import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/services/api';
import { fetchFriends, type FriendUser } from '@/services/friends';
import { emitForwardMessage } from '@/services/socket';
import type { Message } from '@zync/shared-types';
import {
  addGroupMembers,
  createGroup,
  disbandGroup,
  removeGroupMember,
  updateGroupMemberRole,
} from '@/services/groups';
import { useChat, useMessageHistory } from '@/hooks/use-messaging';
import type { DashboardHomeMockData } from '@/components/home-dashboard/home-dashboard.types';
import { DASHBOARD_HOME_MOCK_DATA } from '@/components/home-dashboard/mock-data';
import type { MessageType } from '@zync/shared-types';

interface DashboardUserPatch {
  displayName?: string;
  avatarUrl?: string;
}

interface Conversation {
  _id: string;
  name?: string;
  avatarUrl?: string;
  type: 'direct' | 'group';
  createdBy?: string;
  adminIds?: string[];
  users: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  lastMessage?: { senderId: string; content: string; sentAt: string };
  unreadCounts?: Record<string, number>;
}

interface ConversationListItem {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatar: string;
  avatarUrl?: string;
  isGroup?: boolean;
  createdBy?: string;
  adminIds?: string[];
  memberCount?: number;
  members?: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  online?: boolean;
  active?: boolean;
}

export function useHomeDashboard() {
  const [data, setData] = useState<DashboardHomeMockData>(DASHBOARD_HOME_MOCK_DATA);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>('');
  const [friendsForGroup, setFriendsForGroup] = useState<FriendUser[]>([]);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [forwardModalOpen, setForwardModalOpen] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null);
  const [forwardLoading, setForwardLoading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize chat hook for real-time messaging
  const {
    messages,
    typingUsers,
    messageStatus,
    sendMessage,
    markAsRead,
    startTyping,
    stopTyping,
    deleteMessageForMe,
    recallMessage,
    isLoading: chatLoading,
  } = useChat({
    conversationId: selectedConversationId,
    userId,
    token: (globalThis as Record<string, unknown>)['__accessToken'] as string,
    displayName: data.user.displayName,
  });

  // Use message history hook for pagination
  const messageHistory = useMessageHistory({
    conversationId: selectedConversationId,
  });

  // Build combined message status from both real-time (useChat) and history messages
  const [combinedMessageStatus, setCombinedMessageStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    // Populate status from all loaded messages
    const statusMap: Record<string, string> = { ...messageStatus };

    // Extract status from loaded messages (both real-time and history)
    messageHistory.messages.forEach((msg) => {
      if (msg.status && !statusMap[msg._id]) {
        statusMap[msg._id] = msg.status;
      }
    });

    setCombinedMessageStatus(statusMap);
  }, [messageHistory.messages, messageStatus]);

  // Subscribe to new messages from useChat and add them to messageHistory
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];

      // // Check by idempotencyKey first (to replace optimistic), then by _id
      // const existingIndex = messageHistory.messages.findIndex(m =>
      //   m.idempotencyKey === latestMessage.idempotencyKey ||
      //   m._id === latestMessage._id
      // );

      // if (existingIndex === -1) {
      //   // New message, add it
      //   messageHistory.setMessages([...messageHistory.messages, latestMessage]);
      // } else {
      //   // Replace existing (to transition from optimistic to real ID)
      //   const updated = [...messageHistory.messages];
      //   updated[existingIndex] = latestMessage;
      //   messageHistory.setMessages(updated);
      // }
      messageHistory.setMessages([...messageHistory.messages, latestMessage]);
    }
  }, [messages]);

  // Fetch initial data
  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, requestsRes, convosRes] = await Promise.all([
          apiClient.get('/api/users/me'),
          apiClient.get('/api/friends/requests'),
          apiClient.get('/api/conversations'),
        ]);

        const user = meRes.data.user;
        setUserId(user._id as string);
        const pendingRequests = requestsRes.data.pendingRequests || [];
        const convos: Conversation[] = convosRes.data.data || [];

        setConversations(convos);

        const allFriends: FriendUser[] = [];
        let cursor: string | undefined;
        do {
          const page = await fetchFriends(cursor);
          allFriends.push(...page.friends);
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        setFriendsForGroup(allFriends);

        // Select first conversation
        if (convos.length > 0) {
          setSelectedConversationId(convos[0]._id);
        }

        let unreadMessagesCount = 0;
        let activeGroupsCount = 0;
        const activities: any[] = [];

        convos.forEach((conv: Conversation, index: number) => {
          if (conv.type === 'group') activeGroupsCount++;

          const unreadForMe = conv.unreadCounts?.[user._id] || 0;
          unreadMessagesCount += unreadForMe;

          if (conv.lastMessage && conv.lastMessage?.content) {
            const sender = conv.users?.find((u: any) => u._id === conv.lastMessage?.senderId);

            let title = sender?.displayName || 'Người dùng';
            let messageStr = conv.lastMessage.content || 'Tin nhan media';

            if (conv.type === 'group') {
              title = conv.name || 'Nhóm';
              messageStr = `${sender?.displayName || 'Ai đó'}: ${messageStr}`;
            }

            let initials = 'U';
            if (sender?.displayName) {
              const parts = sender.displayName.split(' ');
              initials = parts.length > 1
                ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
                : parts[0].substring(0, 2).toUpperCase();
            }

            const tones = ['bg-[#97a7b8]', 'bg-[#88b3c8]', 'bg-[#1a6f58]', 'bg-[#0f5845]'];

            activities.push({
              id: `act-${conv._id}-${index}`,
              conversationId: conv._id,
              title,
              message: messageStr,
              timeLabel: new Date(conv.lastMessage.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              initials,
              toneClass: tones[index % tones.length],
              isUnread: unreadForMe > 0,
            });
          }
        });

        const userInitials = user.displayName.split(' ').length > 1
          ? `${user.displayName.split(' ')[0][0]}${user.displayName.split(' ').slice(-1)[0][0]}`.toUpperCase()
          : user.displayName.substring(0, 2).toUpperCase();

        setData(prev => ({
          ...prev,
          greeting: `Xin chào, ${user.displayName}`,
          user: {
            displayName: user.displayName,
            roleLabel: 'Trực tuyến',
            initials: userInitials,
            avatarUrl: user.avatarUrl,
          },
          stats: [
            {
              id: 'stat-1',
              value: unreadMessagesCount.toString().padStart(2, '0'),
              label: 'Số tin nhắn mới',
              badge: unreadMessagesCount > 0 ? `+${unreadMessagesCount}` : '',
              icon: 'message'
            },
            {
              id: 'stat-2',
              value: pendingRequests.length.toString().padStart(2, '0'),
              label: 'Lời mời kết bạn',
              badge: pendingRequests.length > 0 ? pendingRequests.length.toString() : '',
              icon: 'friends'
            },
            {
              id: 'stat-3',
              value: activeGroupsCount.toString().padStart(2, '0'),
              label: 'Nhóm đang hoạt động',
              badge: '',
              icon: 'group'
            },
          ],
          activities: activities.slice(0, 5),
        }));
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Update conversations list when receiving new messages
  useEffect(() => {
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];
    setConversations(prev => prev.map(conv => {
      if (conv._id === latestMessage.conversationId) {
        const messagePreview = latestMessage.content && latestMessage.content.trim().length > 0
          ? latestMessage.content
          : latestMessage.type === 'image'
            ? 'Da gui anh'
            : latestMessage.type === 'video'
              ? 'Da gui video'
              : latestMessage.type?.startsWith('file/')
                ? 'Da gui tep dinh kem'
                : latestMessage.type === 'audio'
                  ? 'Da gui am thanh'
                  : latestMessage.type === 'sticker'
                    ? 'Da gui sticker'
                    : 'Tin nhan media';

        return {
          ...conv,
          lastMessage: {
            senderId: latestMessage.senderId,
            content: messagePreview,
            sentAt: latestMessage.createdAt,
          },
        };
      }
      return conv;
    }));
  }, [messages]);

  const updatePreviewConversation = (message: Message) => {
    setConversations(prev => prev.map(conv => {
      if (conv._id === message.conversationId) {
        const messagePreview = message.content && message.content.trim().length > 0
          ? message.content
          : message.type === 'image'
            ? 'Da gui anh'
            : message.type === 'video'
              ? 'Da gui video'
              : message.type?.startsWith('file/')
                ? 'Da gui tep dinh kem'
                : message.type === 'audio'
                  ? 'Da gui am thanh'
                  : message.type === 'sticker'
                    ? 'Da gui sticker'
                    : 'Tin nhan media';

        return {
          ...conv,
          lastMessage: {
            senderId: message.senderId,
            content: messagePreview,
            sentAt: message.createdAt,
          },
        };
      }
      return conv;
    }));
  }

  const convertConversationsToListItems = useCallback((): ConversationListItem[] => {
    return conversations.map((conv, idx) => ({
      id: conv._id,
      name: conv.type === 'group'
        ? conv.name || 'Nhóm'
        : conv.users.find(u => u._id !== userId)?.displayName || 'Người dùng',
      preview: conv.lastMessage?.content || 'Không có tin nhắn',
      time: conv.lastMessage?.sentAt
        ? new Date(conv.lastMessage.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '',
      avatar: conv.type === 'group'
        ? (conv.name?.substring(0, 2).toUpperCase() || 'GR')
        : (conv.users.find(u => u._id !== userId)?.displayName?.substring(0, 2).toUpperCase() || 'U'),
      avatarUrl: conv.type === 'group'
        ? conv.avatarUrl
        : conv.users.find(u => u._id !== userId)?.avatarUrl,
      isGroup: conv.type === 'group',
      createdBy: conv.createdBy,
      adminIds: conv.adminIds,
      memberCount: conv.users.length,
      members: conv.users,
      online: true,
      active: conv._id === selectedConversationId,
    }));
  }, [conversations, selectedConversationId, userId]);

  const createGroupConversation = useCallback(
    async (name: string, memberIds: string[]) => {
      setGroupActionLoading(true);
      try {
        const createdGroup = await createGroup({ name, memberIds });

        const normalizedConversation: Conversation = {
          _id: createdGroup._id,
          type: 'group',
          name: createdGroup.name,
          avatarUrl: createdGroup.avatarUrl,
          createdBy: createdGroup.createdBy,
          adminIds: createdGroup.adminIds,
          users: createdGroup.users,
          unreadCounts: {},
        };

        setConversations((prev) => [normalizedConversation, ...prev.filter((c) => c._id !== createdGroup._id)]);
        setSelectedConversationId(createdGroup._id);

        return createdGroup;
      } finally {
        setGroupActionLoading(false);
      }
    },
    [],
  );

  const addMembersToGroupConversation = useCallback(
    async (groupId: string, memberIds: string[]) => {
      if (memberIds.length === 0) {
        return;
      }

      setGroupActionLoading(true);
      try {
        const updatedGroup = await addGroupMembers(groupId, { memberIds });

        setConversations((prev) => prev.map((conversation) => {
          if (conversation._id !== groupId) {
            return conversation;
          }

          return {
            ...conversation,
            name: updatedGroup.name,
            avatarUrl: updatedGroup.avatarUrl,
            createdBy: updatedGroup.createdBy,
            adminIds: updatedGroup.adminIds,
            users: updatedGroup.users,
          };
        }));
      } finally {
        setGroupActionLoading(false);
      }
    },
    [],
  );

  const updateGroupMemberRoleConversation = useCallback(
    async (groupId: string, targetUserId: string, role: 'admin' | 'member') => {
      setGroupActionLoading(true);
      try {
        const updatedGroup = await updateGroupMemberRole(groupId, targetUserId, { role });

        setConversations((prev) => prev.map((conversation) => {
          if (conversation._id !== groupId) {
            return conversation;
          }

          return {
            ...conversation,
            name: updatedGroup.name,
            avatarUrl: updatedGroup.avatarUrl,
            createdBy: updatedGroup.createdBy,
            adminIds: updatedGroup.adminIds,
            users: updatedGroup.users,
          };
        }));
      } finally {
        setGroupActionLoading(false);
      }
    },
    [],
  );

  const removeGroupMemberConversation = useCallback(
    async (groupId: string, targetUserId: string) => {
      setGroupActionLoading(true);
      try {
        const updatedGroup = await removeGroupMember(groupId, targetUserId);

        setConversations((prev) => prev.map((conversation) => {
          if (conversation._id !== groupId) {
            return conversation;
          }

          return {
            ...conversation,
            name: updatedGroup.name,
            avatarUrl: updatedGroup.avatarUrl,
            createdBy: updatedGroup.createdBy,
            adminIds: updatedGroup.adminIds,
            users: updatedGroup.users,
          };
        }));
      } finally {
        setGroupActionLoading(false);
      }
    },
    [],
  );

  const disbandGroupConversation = useCallback(
    async (groupId: string) => {
      setGroupActionLoading(true);
      try {
        await disbandGroup(groupId);

        setConversations((prev) => {
          const filtered = prev.filter((conversation) => conversation._id !== groupId);
          if (selectedConversationId === groupId) {
            setSelectedConversationId(filtered[0]?._id ?? '');
          }
          return filtered;
        });
      } finally {
        setGroupActionLoading(false);
      }
    },
    [selectedConversationId],
  );

  const getSelectedConversationInfo = useCallback(() => {
    const conv = conversations.find(c => c._id === selectedConversationId);
    if (!conv) return null;

    if (conv.type === 'group') {
      return {
        participantName: conv.name || 'Nhóm',
        participantAvatar: conv.name?.substring(0, 2).toUpperCase() || 'GR',
        isOnline: true,
      };
    }

    const otherUser = conv.users.find(u => u._id !== userId);
    return {
      participantName: otherUser?.displayName || 'Người dùng',
      participantAvatar: otherUser?.displayName?.substring(0, 2).toUpperCase(),
      isOnline: true,
    };
  }, [conversations, selectedConversationId, userId]);

  // Send message handler
  const handleSendMessage = useCallback(
    async (content: string, type: MessageType, mediaUrl?: string) => {
      if (!selectedConversationId || !userId) return;

      try {
        // Use sendMessage from useChat hook
        await sendMessage(content, type, mediaUrl);
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [selectedConversationId, userId, sendMessage],
  );

  // Start typing handler
  const handleStartTyping = useCallback(() => {
    if (!selectedConversationId) return;

    startTyping();

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set debounce timeout (3s)
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping();
      typingTimeoutRef.current = null;
    }, 3000);
  }, [selectedConversationId, startTyping, stopTyping]);

  // Stop typing handler
  const handleStopTyping = useCallback(() => {
    if (!selectedConversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    stopTyping();
  }, [selectedConversationId, stopTyping]);

  // Forward message
  const handleForwardMessage = useCallback((message: Message) => {
    setForwardingMessage(message);
    setForwardModalOpen(true);
  }, []);

  const handleExecuteForward = useCallback(async (toConversationId: string) => {
    if (!forwardingMessage) return;

    try {
      setForwardLoading(true);
      
      const idempotencyKey = forwardingMessage.idempotencyKey || uuidv4();

      // Emit forward message
      emitForwardMessage(forwardingMessage._id, toConversationId, idempotencyKey);

      await new Promise((resolve) => setTimeout(resolve, 1000))

      updatePreviewConversation({
        ...forwardingMessage,
        conversationId: toConversationId,
        createdAt: new Date().toISOString(),
      })

      setSelectedConversationId(toConversationId)

      setForwardModalOpen(false);
      setForwardingMessage(null);
    } finally {
      setForwardLoading(false);
    }
  }, [forwardingMessage]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    userId,
    conversations: convertConversationsToListItems(),
    selectedConversationId,
    onSelectConversation: setSelectedConversationId,
    messages: messageHistory.messages,
    messageStatus: combinedMessageStatus,
    messagesLoading: messageHistory.loading,
    conversationInfo: getSelectedConversationInfo(),
    typingUsers,
    friendsForGroup,
    groupActionLoading,
    onCreateGroup: createGroupConversation,
    onAddGroupMembers: addMembersToGroupConversation,
    onUpdateGroupMemberRole: updateGroupMemberRoleConversation,
    onRemoveGroupMember: removeGroupMemberConversation,
    onDisbandGroup: disbandGroupConversation,
    onSendMessage: handleSendMessage,
    onStartTyping: handleStartTyping,
    onStopTyping: handleStopTyping,
    onDeleteMessageForMe: deleteMessageForMe,
    onRecallMessage: recallMessage,
    onForwardMessage: handleForwardMessage,
    forwardModalOpen,
    setForwardModalOpen,
    forwardingMessage,
    forwardLoading,
    onCloseForwardModal: () => {
      setForwardModalOpen(false);
      setForwardingMessage(null);
    },
    onExecuteForward: handleExecuteForward,
    onLoadMore: messageHistory.loadMore,
    onPatchDashboardUser: (payload: DashboardUserPatch) => {
      setData((prev) => {
        const displayName = payload.displayName ?? prev.user.displayName;
        const nameParts = displayName.trim().split(/\s+/).filter(Boolean);
        const initials = nameParts.length === 0
          ? prev.user.initials
          : nameParts.length === 1
            ? nameParts[0].slice(0, 2).toUpperCase()
            : `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();

        return {
          ...prev,
          greeting: `Xin chào, ${displayName}`,
          user: {
            ...prev.user,
            displayName,
            initials,
            avatarUrl: payload.avatarUrl ?? prev.user.avatarUrl,
          },
        };
      });
    },
  };
}
