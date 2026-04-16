import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { apiClient } from '@/services/api';
import { fetchFriends, type FriendUser } from '@/services/friends';
import {
  emitForwardMessage,
  emitReactionRemoveAllMine,
  emitReactionUpsert,
  listenToReactionAck,
  listenToReactionError,
  listenToReactionUpdated,
  unlistenToReactionAck,
  unlistenToReactionError,
  unlistenToReactionUpdated,
} from '@/services/socket';
import { getMessageReactionDetails, type ReactionDetailsResponse } from '@/services/chat';
import type { Message, MessageReactionSummary, MessageReactionUserState } from '@zync/shared-types';
import {
  addGroupMembers,
  createGroup,
  disbandGroup,
  removeGroupMember,
  updateGroup,
  updateGroupMemberApproval,
  updateGroupMemberRole,
} from '@/services/groups';
import { getSocket } from '@/services/socket';
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
  memberApprovalEnabled?: boolean;
  removedFromGroup?: boolean;
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
  memberApprovalEnabled?: boolean;
  removedFromGroup?: boolean;
  memberCount?: number;
  members?: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  online?: boolean;
  active?: boolean;
}

const REACTION_ACK_TIMEOUT_MS = 8000;

interface PendingReactionRequest {
  requestId: string;
  messageId: string;
  messageRef: string;
  previousSummary: MessageReactionSummary;
  previousUserState: MessageReactionUserState;
  ackTimeout: NodeJS.Timeout | null;
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
  const [reactionUserStateByMessage, setReactionUserStateByMessage] = useState<Record<string, MessageReactionUserState>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingReactionRequestsRef = useRef<Map<string, PendingReactionRequest>>(new Map());
  const hydratedReactionStateRefsRef = useRef<Set<string>>(new Set());

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
    userPenaltyScore,
    userMutedUntil,
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

  const resolveMessageRef = useCallback((message: Message): string => {
    return message.idempotencyKey || message._id;
  }, []);

  const applyReactionSummaryToMessage = useCallback(
    (
      target: { messageId?: string; messageRef?: string },
      summary: MessageReactionSummary,
      userState?: MessageReactionUserState,
    ) => {
      messageHistory.setMessages((prev) =>
        prev.map((msg) => {
          const msgId = String(msg._id);
          const msgRef = String(msg.idempotencyKey || '');
          const targetMessageId = String(target.messageId || '');
          const targetMessageRef = String(target.messageRef || '');

          const isTarget =
            msgId === targetMessageId
            || msgId === targetMessageRef
            || msgRef === targetMessageId
            || msgRef === targetMessageRef;

          if (!isTarget) {
            return msg;
          }

          return {
            ...msg,
            reactionSummary: summary,
            reactionUserState: userState ?? msg.reactionUserState,
          };
        }),
      );
    },
    [messageHistory.setMessages],
  );

  const updateReactionUserStateCache = useCallback(
    (messageId: string, messageRef: string, nextUserState: MessageReactionUserState) => {
      setReactionUserStateByMessage((prev) => ({
        ...prev,
        [messageId]: nextUserState,
        [messageRef]: nextUserState,
      }));
    },
    [],
  );

  const completePendingReaction = useCallback((requestId?: string) => {
    if (!requestId) {
      return;
    }

    const pending = pendingReactionRequestsRef.current.get(requestId);
    if (!pending) {
      return;
    }

    if (pending.ackTimeout) {
      clearTimeout(pending.ackTimeout);
    }

    pendingReactionRequestsRef.current.delete(requestId);
  }, []);

  const rollbackPendingReaction = useCallback(
    (requestId: string, reason: string) => {
      const pending = pendingReactionRequestsRef.current.get(requestId);
      if (!pending) {
        return;
      }

      if (pending.ackTimeout) {
        clearTimeout(pending.ackTimeout);
      }

      applyReactionSummaryToMessage(
        { messageId: pending.messageId, messageRef: pending.messageRef },
        pending.previousSummary,
        pending.previousUserState,
      );
      updateReactionUserStateCache(pending.messageId, pending.messageRef, pending.previousUserState);

      pendingReactionRequestsRef.current.delete(requestId);
      console.warn(`[Reaction] Rolled back request ${requestId}: ${reason}`);
    },
    [applyReactionSummaryToMessage, updateReactionUserStateCache],
  );

  const registerPendingReaction = useCallback(
    (params: {
      requestId: string;
      messageId: string;
      messageRef: string;
      previousSummary: MessageReactionSummary;
      previousUserState: MessageReactionUserState;
    }) => {
      const previous = pendingReactionRequestsRef.current.get(params.requestId);
      if (previous?.ackTimeout) {
        clearTimeout(previous.ackTimeout);
      }

      const ackTimeout = setTimeout(() => {
        rollbackPendingReaction(params.requestId, 'ACK timeout');
      }, REACTION_ACK_TIMEOUT_MS);

      pendingReactionRequestsRef.current.set(params.requestId, {
        ...params,
        ackTimeout,
      });
    },
    [rollbackPendingReaction],
  );

  // Subscribe to new messages from useChat and add them to messageHistory
  useEffect(() => {
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];

      messageHistory.setMessages((prev) => {
        const exists = prev.some(
          (msg) => msg._id === latestMessage._id || msg.idempotencyKey === latestMessage.idempotencyKey,
        );
        if (exists) {
          return prev;
        }
        return [...prev, latestMessage];
      });
    }
  }, [messages, messageHistory.setMessages]);

  useEffect(() => {
    hydratedReactionStateRefsRef.current.clear();
  }, [selectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId || !userId || messageHistory.messages.length === 0) {
      return;
    }

    const candidates = messageHistory.messages.filter((msg) => {
      const totalCount = msg.reactionSummary?.totalCount || 0;
      if (totalCount <= 0) {
        return false;
      }

      const messageRef = resolveMessageRef(msg);
      if (hydratedReactionStateRefsRef.current.has(messageRef)) {
        return false;
      }

      return !reactionUserStateByMessage[msg._id] && !reactionUserStateByMessage[messageRef];
    });

    if (candidates.length === 0) {
      return;
    }

    candidates.forEach((msg) => hydratedReactionStateRefsRef.current.add(resolveMessageRef(msg)));

    let cancelled = false;

    void (async () => {
      const updates: Array<{
        messageId: string;
        messageRef: string;
        userState: MessageReactionUserState;
      }> = [];

      await Promise.allSettled(
        candidates.map(async (msg) => {
          try {
            const messageRef = resolveMessageRef(msg);
            const details = await getMessageReactionDetails(messageRef);
            const me = details.rows.find((row) => row.userId === userId && row.totalCount > 0);
            if (!me) {
              return;
            }

            updates.push({
              messageId: details.messageId || msg._id,
              messageRef,
              userState: {
                lastEmoji: me.lastEmoji,
                totalCount: me.totalCount,
                emojiCounts: me.emojiCounts,
              },
            });
          } catch {
            // Ignore one-off hydrate failures; realtime updates will still reconcile.
          }
        }),
      );

      if (cancelled || updates.length === 0) {
        return;
      }

      setReactionUserStateByMessage((prev) => {
        const next = { ...prev };
        updates.forEach((item) => {
          next[item.messageId] = item.userState;
          next[item.messageRef] = item.userState;
        });
        return next;
      });

      messageHistory.setMessages((prev) =>
        prev.map((msg) => {
          const msgId = String(msg._id);
          const msgRef = String(msg.idempotencyKey || '');
          const found = updates.find(
            (item) =>
              msgId === String(item.messageId)
              || msgId === String(item.messageRef)
              || msgRef === String(item.messageId)
              || msgRef === String(item.messageRef),
          );

          if (!found) {
            return msg;
          }

          return {
            ...msg,
            reactionUserState: found.userState,
          };
        }),
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [
    messageHistory.messages,
    messageHistory.setMessages,
    reactionUserStateByMessage,
    resolveMessageRef,
    selectedConversationId,
    userId,
  ]);

  useEffect(() => {
    const handleReactionAck = (payload: {
      requestId: string;
      accepted: boolean;
      conversationId: string;
    }) => {
      if (payload.conversationId !== selectedConversationId) {
        return;
      }

      const pending = pendingReactionRequestsRef.current.get(payload.requestId);
      if (!pending) {
        return;
      }

      if (!payload.accepted) {
        rollbackPendingReaction(payload.requestId, 'Server rejected request');
        return;
      }

      if (pending.ackTimeout) {
        clearTimeout(pending.ackTimeout);
      }

      pendingReactionRequestsRef.current.set(payload.requestId, {
        ...pending,
        ackTimeout: null,
      });
    };

    const handleReactionUpdated = (payload: {
      requestId?: string;
      messageId: string;
      messageRef: string;
      conversationId: string;
      actor: {
        userId: string;
      };
      summary: MessageReactionSummary;
      userState?: MessageReactionUserState;
    }) => {
      if (payload.conversationId !== selectedConversationId) {
        return;
      }

      applyReactionSummaryToMessage(
        { messageId: payload.messageId, messageRef: payload.messageRef },
        payload.summary,
        payload.actor.userId === userId ? payload.userState : undefined,
      );

      if (payload.actor.userId === userId && payload.userState) {
        const nextUserState = payload.userState;
        updateReactionUserStateCache(payload.messageId, payload.messageRef, nextUserState);
      }

      if (payload.actor.userId === userId && payload.requestId) {
        completePendingReaction(payload.requestId);
      }
    };

    const handleReactionError = (payload: { requestId?: string; message: string }) => {
      if (payload.requestId) {
        rollbackPendingReaction(payload.requestId, payload.message);
        return;
      }

      console.error('[Reaction] Socket error:', payload.message);
    };

    listenToReactionAck(handleReactionAck);
    listenToReactionUpdated(handleReactionUpdated);
    listenToReactionError(handleReactionError);

    return () => {
      unlistenToReactionAck();
      unlistenToReactionUpdated();
      unlistenToReactionError();
    };
  }, [
    applyReactionSummaryToMessage,
    completePendingReaction,
    rollbackPendingReaction,
    selectedConversationId,
    updateReactionUserStateCache,
    userId,
  ]);

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
      memberApprovalEnabled: conv.memberApprovalEnabled,
      removedFromGroup: conv.removedFromGroup,
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
          memberApprovalEnabled: createdGroup.memberApprovalEnabled,
          removedFromGroup: false,
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
            memberApprovalEnabled: updatedGroup.memberApprovalEnabled,
            removedFromGroup: false,
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
            memberApprovalEnabled: updatedGroup.memberApprovalEnabled,
            removedFromGroup: false,
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
            memberApprovalEnabled: updatedGroup.memberApprovalEnabled,
            removedFromGroup: false,
            users: updatedGroup.users,
          };
        }));
      } finally {
        setGroupActionLoading(false);
      }
    },
    [],
  );

  const updateGroupMemberApprovalConversation = useCallback(
    async (groupId: string, memberApprovalEnabled: boolean) => {
      setGroupActionLoading(true);
      try {
        const updatedGroup = await updateGroupMemberApproval(groupId, { memberApprovalEnabled });

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
            memberApprovalEnabled: updatedGroup.memberApprovalEnabled,
            removedFromGroup: false,
            users: updatedGroup.users,
          };
        }));
      } finally {
        setGroupActionLoading(false);
      }
    },
    [],
  );

  const ensureConversationAvailable = useCallback(
    async (groupId: string) => {
      try {
        const convosRes = await apiClient.get('/api/conversations');
        const convos: Conversation[] = convosRes.data.data || [];
        const matched = convos.find((conversation) => conversation._id === groupId);
        if (!matched) {
          return;
        }

        setConversations((prev) => {
          const exists = prev.some((conversation) => conversation._id === groupId);
          if (exists) {
            return prev;
          }
          return [matched, ...prev];
        });
      } catch (error) {
        console.error('Failed to sync newly added group conversation', error);
      }
    },
    [],
  );

  useEffect(() => {
    const token = (globalThis as Record<string, unknown>)['__accessToken'] as string;
    if (!token || !userId) {
      return;
    }

    const socket = getSocket(token);
    type GroupUpdatedEvent = {
      groupId: string;
      type: 'created' | 'name_changed' | 'avatar_changed' | 'member_added' | 'member_removed' | 'role_changed' | 'member_approval_changed' | 'disbanded';
      data: Record<string, unknown>;
    };

    const handleGroupUpdated = (payload: GroupUpdatedEvent) => {
      if (payload.type === 'member_added') {
        const addedMemberIds = (payload.data['memberIds'] as string[] | undefined) ?? [];
        if (addedMemberIds.includes(userId)) {
          void ensureConversationAvailable(payload.groupId);
        }
      }

      setConversations((prev) => {
        const index = prev.findIndex((conversation) => conversation._id === payload.groupId);

        if (payload.type === 'disbanded') {
          if (index === -1) {
            return prev;
          }
          return prev.filter((conversation) => conversation._id !== payload.groupId);
        }

        if (payload.type === 'created') {
          const group = payload.data['group'] as Conversation | undefined;
          if (!group) {
            return prev;
          }
          const normalized = {
            ...group,
            memberApprovalEnabled: group.memberApprovalEnabled ?? false,
            removedFromGroup: false,
          };
          if (index === -1) {
            return [normalized, ...prev];
          }
          const updated = [...prev];
          updated[index] = { ...updated[index], ...normalized };
          return updated;
        }

        if (index === -1) {
          return prev;
        }

        const updated = [...prev];
        const current = updated[index] as Conversation;

        if (payload.type === 'name_changed') {
          current.name = payload.data['name'] as string | undefined;
        }

        if (payload.type === 'avatar_changed') {
          current.avatarUrl = payload.data['avatarUrl'] as string | undefined;
        }

        if (payload.type === 'member_approval_changed') {
          current.memberApprovalEnabled = Boolean(payload.data['memberApprovalEnabled']);
        }

        if (payload.type === 'member_removed') {
          const removedUserId = payload.data['userId'] as string | undefined;
          if (removedUserId === userId) {
            const filtered = prev.filter((conversation) => conversation._id !== payload.groupId);
            if (selectedConversationId === payload.groupId) {
              setSelectedConversationId(filtered[0]?._id ?? '');
            }
            return filtered;
          }

          if (removedUserId) {
            current.users = current.users.filter((member) => member._id !== removedUserId);
            current.adminIds = (current.adminIds ?? []).filter((id) => id !== removedUserId);
          }
        }

        updated[index] = { ...current };
        return updated;
      });
    };

    socket.on('group_updated', handleGroupUpdated);

    return () => {
      socket.off('group_updated', handleGroupUpdated);
    };
  }, [ensureConversationAvailable, selectedConversationId, userId]);

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
        participantAvatarUrl: conv.avatarUrl,
        isOnline: true,
      };
    }

    const otherUser = conv.users.find(u => u._id !== userId);
    return {
      participantName: otherUser?.displayName || 'Người dùng',
      participantAvatar: otherUser?.displayName?.substring(0, 2).toUpperCase(),
      participantAvatarUrl: otherUser?.avatarUrl,
      isOnline: true,
    };
  }, [conversations, selectedConversationId, userId]);

  const updateGroupConversation = useCallback(
    async (groupId: string, payload: { name?: string; avatarUrl?: string | null }) => {
      setGroupActionLoading(true);
      try {
        const updatedGroup = await updateGroup(groupId, payload);

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
            memberApprovalEnabled: updatedGroup.memberApprovalEnabled,
            removedFromGroup: false,
            users: updatedGroup.users,
          };
        }));
      } finally {
        setGroupActionLoading(false);
      }
    },
    [],
  );

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

  const handleReactionUpsert = useCallback(
    (message: Message, emoji: string, delta: 1 | 2 | 3, actionSource: string) => {
      if (!selectedConversationId) {
        return;
      }

      const messageRef = resolveMessageRef(message);
      const requestId = uuidv4();
      const idempotencyKey = uuidv4();

      const prevUserState = reactionUserStateByMessage[message._id] || message.reactionUserState;
      const prevSummary = message.reactionSummary || { totalCount: 0, emojiCounts: {} };
      const previousSummary: MessageReactionSummary = {
        totalCount: prevSummary.totalCount,
        emojiCounts: { ...(prevSummary.emojiCounts || {}) },
      };
      const previousUserState: MessageReactionUserState = prevUserState
        ? {
          lastEmoji: prevUserState.lastEmoji,
          totalCount: prevUserState.totalCount,
          emojiCounts: { ...(prevUserState.emojiCounts || {}) },
        }
        : {
          lastEmoji: null,
          totalCount: 0,
          emojiCounts: {},
        };

      const nextEmojiCounts = { ...(prevSummary.emojiCounts || {}) };
      nextEmojiCounts[emoji] = (nextEmojiCounts[emoji] || 0) + delta;

      const nextSummary: MessageReactionSummary = {
        totalCount: prevSummary.totalCount + delta,
        emojiCounts: nextEmojiCounts,
      };

      const nextUserEmojiCounts = { ...(prevUserState?.emojiCounts || {}) };
      nextUserEmojiCounts[emoji] = (nextUserEmojiCounts[emoji] || 0) + delta;

      const nextUserState: MessageReactionUserState = {
        lastEmoji: emoji,
        totalCount: (prevUserState?.totalCount || 0) + delta,
        emojiCounts: nextUserEmojiCounts,
      };

      registerPendingReaction({
        requestId,
        messageId: message._id,
        messageRef,
        previousSummary,
        previousUserState,
      });

      applyReactionSummaryToMessage({ messageId: message._id, messageRef }, nextSummary, nextUserState);
      updateReactionUserStateCache(message._id, messageRef, nextUserState);

      try {
        emitReactionUpsert(
          selectedConversationId,
          messageRef,
          emoji,
          delta,
          idempotencyKey,
          actionSource,
          requestId,
        );
      } catch (error) {
        console.error('Failed to emit reaction_upsert', error);
        rollbackPendingReaction(requestId, 'Failed to emit reaction_upsert');
      }
    },
    [
      applyReactionSummaryToMessage,
      reactionUserStateByMessage,
      registerPendingReaction,
      resolveMessageRef,
      rollbackPendingReaction,
      selectedConversationId,
      updateReactionUserStateCache,
    ],
  );

  const handleReactionRemoveAllMine = useCallback(
    (message: Message) => {
      if (!selectedConversationId) {
        return;
      }

      const messageRef = resolveMessageRef(message);
      const requestId = uuidv4();
      const idempotencyKey = uuidv4();
      const myState = reactionUserStateByMessage[message._id] || message.reactionUserState;

      if (!myState || myState.totalCount <= 0) {
        return;
      }

      const summary = message.reactionSummary || { totalCount: 0, emojiCounts: {} };
      const previousSummary: MessageReactionSummary = {
        totalCount: summary.totalCount,
        emojiCounts: { ...(summary.emojiCounts || {}) },
      };
      const previousUserState: MessageReactionUserState = myState
        ? {
          lastEmoji: myState.lastEmoji,
          totalCount: myState.totalCount,
          emojiCounts: { ...(myState.emojiCounts || {}) },
        }
        : {
          lastEmoji: null,
          totalCount: 0,
          emojiCounts: {},
        };
      const nextEmojiCounts: Record<string, number> = { ...(summary.emojiCounts || {}) };

      Object.entries(myState.emojiCounts).forEach(([emoji, count]) => {
        nextEmojiCounts[emoji] = Math.max(0, (nextEmojiCounts[emoji] || 0) - count);
        if (nextEmojiCounts[emoji] === 0) {
          delete nextEmojiCounts[emoji];
        }
      });

      const nextSummary: MessageReactionSummary = {
        totalCount: Math.max(0, summary.totalCount - myState.totalCount),
        emojiCounts: nextEmojiCounts,
      };

      const clearedUserState: MessageReactionUserState = {
        lastEmoji: null,
        totalCount: 0,
        emojiCounts: {},
      };

      registerPendingReaction({
        requestId,
        messageId: message._id,
        messageRef,
        previousSummary,
        previousUserState,
      });

      applyReactionSummaryToMessage({ messageId: message._id, messageRef }, nextSummary, clearedUserState);
      updateReactionUserStateCache(message._id, messageRef, clearedUserState);

      try {
        emitReactionRemoveAllMine(selectedConversationId, messageRef, idempotencyKey, requestId);
      } catch (error) {
        console.error('Failed to emit reaction_remove_all_mine', error);
        rollbackPendingReaction(requestId, 'Failed to emit reaction_remove_all_mine');
      }
    },
    [
      applyReactionSummaryToMessage,
      reactionUserStateByMessage,
      registerPendingReaction,
      resolveMessageRef,
      rollbackPendingReaction,
      selectedConversationId,
      updateReactionUserStateCache,
    ],
  );

  const handleFetchReactionDetails = useCallback(
    async (message: Message): Promise<ReactionDetailsResponse> => {
      const messageRef = resolveMessageRef(message);
      return getMessageReactionDetails(messageRef);
    },
    [resolveMessageRef],
  );

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

      pendingReactionRequestsRef.current.forEach((pending) => {
        if (pending.ackTimeout) {
          clearTimeout(pending.ackTimeout);
        }
      });
      pendingReactionRequestsRef.current.clear();
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
    onUpdateGroup: updateGroupConversation,
    onAddGroupMembers: addMembersToGroupConversation,
    onUpdateGroupMemberRole: updateGroupMemberRoleConversation,
    onUpdateGroupMemberApproval: updateGroupMemberApprovalConversation,
    onRemoveGroupMember: removeGroupMemberConversation,
    onDisbandGroup: disbandGroupConversation,
    onSendMessage: handleSendMessage,
    onStartTyping: handleStartTyping,
    onStopTyping: handleStopTyping,
    onDeleteMessageForMe: deleteMessageForMe,
    onRecallMessage: recallMessage,
    onForwardMessage: handleForwardMessage,
    onReactionUpsert: handleReactionUpsert,
    onReactionRemoveAllMine: handleReactionRemoveAllMine,
    onFetchReactionDetails: handleFetchReactionDetails,
    reactionUserStateByMessage,
    userPenaltyScore,
    userMutedUntil,
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
