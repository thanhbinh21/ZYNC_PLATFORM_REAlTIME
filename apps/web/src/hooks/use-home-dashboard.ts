import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/services/api';
import { getMessages } from '@/services/chat';
import { fetchFriends, type FriendUser } from '@/services/friends';
import { addGroupMembers, createGroup } from '@/services/groups';
import socketService from '@/services/socket';
import type { DashboardHomeMockData } from '@/components/home-dashboard/home-dashboard.types';
import { DASHBOARD_HOME_MOCK_DATA } from '@/components/home-dashboard/mock-data';
import type { Message } from '@zync/shared-types';

interface Conversation {
  _id: string;
  name?: string;
  avatarUrl?: string;
  type: 'direct' | 'group';
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; displayName: string }>>([]);
  const [friendsForGroup, setFriendsForGroup] = useState<FriendUser[]>([]);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
            let messageStr = conv.lastMessage.content;
            
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
          user: {
            displayName: user.displayName,
            roleLabel: 'Trực tuyến',
            initials: userInitials,
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

  // Fetch messages for selected conversation
  useEffect(() => {
    async function loadMessages() {
      if (!selectedConversationId) return;
      
      setMessagesLoading(true);
      try {
        const { messages: fetchedMessages } = await getMessages(selectedConversationId, undefined, 30);
        setMessages(fetchedMessages.reverse()); // Oldest first
      } catch (error) {
        console.error('Failed to fetch messages', error);
      } finally {
        setMessagesLoading(false);
      }
    }

    loadMessages();
  }, [selectedConversationId]);

  // Socket listeners for real-time updates
  useEffect(() => {
    const handleNewMessage = (data: {
      messageId: string;
      conversationId?: string;
      senderId: string;
      content: string;
      type: string;
      mediaUrl?: string;
      createdAt: string;
    }) => {
      const targetConversationId = data.conversationId ?? selectedConversationId;
      if (!targetConversationId) return;

      const message: Message = {
        _id: data.messageId,
        conversationId: targetConversationId,
        senderId: data.senderId,
        content: data.content,
        type: data.type as any,
        mediaUrl: data.mediaUrl,
        createdAt: data.createdAt,
        idempotencyKey: '',
        status: 'sent',
      };

      // Prevent duplicate append when same message event arrives more than once.
      setMessages((prev) => {
        if (prev.some((item) => item._id === message._id)) {
          return prev;
        }
        return [...prev, message];
      });
      
      // Clear typing indicator for sender (they finished typing and sent message)
      setTypingUsers(prev => prev.filter(u => u.userId !== data.senderId));
      
      // Update conversation
      setConversations(prev => prev.map(conv => {
        if (conv._id === targetConversationId) {
          return {
            ...conv,
            lastMessage: {
              senderId: data.senderId,
              content: data.content,
              sentAt: data.createdAt,
            },
          };
        }
        return conv;
      }));
    };

    const handleStatusUpdate = (update: any) => {
      setMessages(prev => prev.map(msg => {
        if (msg._id === update.messageId) {
          return { ...msg, status: update.status };
        }
        return msg;
      }));
    };

    const handleTypingIndicator = (typing: {
      userId: string;
      conversationId: string;
      isTyping: boolean;
    }) => {
      // Only handle typing for current conversation
      if (typing.conversationId !== selectedConversationId) return;
      
      // Get user info from conversation
      const conversation = conversations.find(c => c._id === selectedConversationId);
      const typingUser = conversation?.users.find(u => u._id === typing.userId);
      
      if (!typingUser) return;

      setTypingUsers(prev => {
        if (typing.isTyping) {
          // Add user if not already in list
          if (!prev.find(u => u.userId === typing.userId)) {
            return [...prev, { userId: typing.userId, displayName: typingUser.displayName }];
          }
          return prev;
        } else {
          // Remove user from typing list
          return prev.filter(u => u.userId !== typing.userId);
        }
      });
    };

    // Setup socket listeners for real-time messaging
    // First, initialize socket connection with token
    const tokenFromMemory = (globalThis as Record<string, unknown>)['__accessToken'] as string | undefined;
    const tokenFromStorage = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    const token = tokenFromMemory ?? tokenFromStorage;
    if (token) {
      try {
        socketService.getSocket(token);
        if (selectedConversationId) {
          socketService.joinConversation(selectedConversationId);
        }
        socketService.listenToMessages(handleNewMessage);
        socketService.listenToStatusUpdates(handleStatusUpdate);
        socketService.listenToTypingIndicators(handleTypingIndicator);
      } catch (error) {
        console.error('Failed to setup socket listeners:', error);
      }
    }

    return () => {
      // Cleanup listeners
      socketService.unlistenToMessages();
      socketService.unlistenToStatusUpdates();
      socketService.unlistenToTypingIndicators();
    };
  }, [selectedConversationId]);

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
          adminIds: createdGroup.adminIds,
          users: createdGroup.users,
          unreadCounts: {},
        };

        setConversations((prev) => [normalizedConversation, ...prev.filter((c) => c._id !== createdGroup._id)]);
        setSelectedConversationId(createdGroup._id);
        setMessages([]);

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
    async (content: string, type: 'text' | 'image' | 'video', mediaUrl?: string) => {
      if (!selectedConversationId || !userId) return;

      try {
        const idempotencyKey = uuidv4();

        // Emit via Socket.IO
        socketService.sendMessage(selectedConversationId, content, type, idempotencyKey, mediaUrl);

        // Clear typing indicator after sending
        setTypingUsers(prev => prev.filter(u => u.userId !== userId));
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    },
    [selectedConversationId, userId],
  );

  // Start typing handler
  const handleStartTyping = useCallback(() => {
    if (!selectedConversationId) return;

    socketService.startTyping(selectedConversationId);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set debounce timeout (3s)
    typingTimeoutRef.current = setTimeout(() => {
      socketService.stopTyping(selectedConversationId);
      typingTimeoutRef.current = null;
    }, 3000);
  }, [selectedConversationId]);

  // Stop typing handler
  const handleStopTyping = useCallback(() => {
    if (!selectedConversationId) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    socketService.stopTyping(selectedConversationId);
  }, [selectedConversationId]);

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
    messages,
    messagesLoading,
    conversationInfo: getSelectedConversationInfo(),
    typingUsers,
    friendsForGroup,
    groupActionLoading,
    onCreateGroup: createGroupConversation,
    onAddGroupMembers: addMembersToGroupConversation,
    onSendMessage: handleSendMessage,
    onStartTyping: handleStartTyping,
    onStopTyping: handleStopTyping,
  };
}
