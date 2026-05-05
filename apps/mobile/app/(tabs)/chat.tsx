import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme/colors';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';
import { getAppTheme } from '../../src/theme/get-app-theme';
import api from '../../src/services/api';
import { socketService } from '../../src/services/socket';
import { useAuthStore } from '../../src/store/useAuthStore';
import { usePresence } from '../../src/hooks/usePresence';

// ───────── Types ─────────
interface ConversationMember {
  _id: string;
  displayName?: string;
  avatarUrl?: string;
}

interface LastMessage {
  content?: string;
  type?: string;
  senderId?: string;
  sentAt?: string;
}

interface Conversation {
  _id: string;
  name?: string;
  avatarUrl?: string;
  type: 'private' | 'group' | 'direct';
  users?: ConversationMember[];
  lastMessage?: LastMessage;
  unreadCount?: number;
  unreadCounts?: Record<string, number>;
  updatedAt?: string;
}

interface NotificationPreferences {
  pinnedConversations?: string[];
}

interface FriendUser {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

interface SearchTarget {
  key: string;
  type: 'friend' | 'group';
  id: string;
  name: string;
  avatarUrl?: string;
  conversationId?: string;
}

type ChatListItem = Conversation | SearchTarget;

function isSearchTarget(item: ChatListItem): item is SearchTarget {
  return 'key' in item;
}

interface IncomingMessageEvent {
  conversationId?: string;
  senderId?: string | { _id?: string };
  content?: string;
  type?: string;
  createdAt?: string;
}

interface MessageDeletedForMeEvent {
  messageId?: string;
  conversationId?: string;
  deletedAt?: string;
}

interface MessageRecalledEvent {
  messageId?: string;
  idempotencyKey?: string;
  conversationId?: string;
  recalledBy?: string;
  recalledAt?: string;
}

interface GroupUpdatedEvent {
  groupId?: string;
  type?: 'created' | 'name_changed' | 'avatar_changed' | 'member_added' | 'member_removed' | 'role_changed' | 'member_approval_changed' | 'disbanded';
  data?: {
    userId?: string;
    memberIds?: string[];
    name?: string;
    avatarUrl?: string;
  };
}

function normalizeSenderId(senderId?: IncomingMessageEvent['senderId']): string {
  if (!senderId) return '';
  if (typeof senderId === 'string') return senderId;
  if (typeof senderId === 'object' && senderId._id) return String(senderId._id);
  return '';
}

function getConversationName(conv: Conversation, myUserId: string): string {
  if (conv.type === 'group') return conv.name || 'Nhóm chat';
  const other = conv.users?.find((m) => m._id !== myUserId);
  return other?.displayName || 'Chat';
}

function getLastMessagePreview(msg?: LastMessage): string {
  if (!msg) return 'Chua co tin nhan';
  if (msg.type?.startsWith('file/')) return 'Tep dinh kem';

  switch (msg.type) {
    case 'image':
      return 'Anh';
    case 'video':
      return 'Video';
    case 'audio':
      return 'Am thanh';
    case 'sticker':
      return 'Nhan dan';
    default:
      return msg.content || 'Tin nhan moi';
  }
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return '';
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  
  if (diff < 60_000) return 'Vừa xong';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} phút`;
  if (diff < 86_400_000) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 172_800_000) return 'Hôm qua';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export default function ChatScreen() {
  const router = useRouter();
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);
  const userInfo = useAuthStore((s) => s.userInfo);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = String(userInfo?._id || userInfo?.id || '');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [allFriends, setAllFriends] = useState<FriendUser[]>([]);
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const joinAllConversations = useCallback((items: Conversation[]) => {
    const socket = socketService.getSocket();
    if (!socket) return;

    for (const conversation of items) {
      socket.emit('join_conversation', { conversationId: conversation._id });
    }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const loadAllFriends = async (): Promise<FriendUser[]> => {
        const friends: FriendUser[] = [];
        let cursor: string | undefined;

        do {
          const response = await api.get('/friends', { params: { limit: 50, cursor } });
          const page = Array.isArray(response.data?.friends) ? (response.data.friends as FriendUser[]) : [];
          const nextCursor = typeof response.data?.nextCursor === 'string' ? response.data.nextCursor : null;
          friends.push(...page);
          cursor = nextCursor ?? undefined;
        } while (cursor);

        return friends;
      };

      const [res, prefRes, friends] = await Promise.all([
        api.get('/conversations'),
        api.get('/notifications/preferences'),
        loadAllFriends(),
      ]);
      const items = Array.isArray(res.data?.data) ? (res.data.data as Conversation[]) : [];
      const prefs = (prefRes.data?.data || {}) as NotificationPreferences;
      const pinnedIds = Array.isArray(prefs.pinnedConversations) ? prefs.pinnedConversations : [];

      setConversations(items);
      setPinnedConversationIds(pinnedIds);
      setAllFriends(friends);
      joinAllConversations(items);
    } catch (err: any) {
      console.error('[ERROR] Failed to load conversations:', err?.response?.data || err?.message || err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [joinAllConversations]);

  // Load conversations on mount + when auth changes
  useEffect(() => {
    if (isAuthenticated) {
      void loadConversations();
    }
  }, [isAuthenticated, loadConversations]);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        void loadConversations();
      }
      return undefined;
    }, [isAuthenticated, loadConversations]),
  );

  // Listen for real-time updates (new messages = re-sort and update preview)
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleNewMessage = (payload: IncomingMessageEvent) => {
      const conversationId = payload?.conversationId;
      if (typeof conversationId === 'string' && conversationId) {
        const senderId = normalizeSenderId(payload.senderId);
        const sentAt = payload.createdAt || new Date().toISOString();

        setConversations((prev) => {
          const idx = prev.findIndex((conv) => conv._id === conversationId);
          if (idx < 0) return prev;

          const current = prev[idx];
          const isFromOtherUser = Boolean(senderId) && senderId !== userId;
          const currentUnread = current.unreadCount ?? current.unreadCounts?.[userId] ?? 0;
          const nextUnread = isFromOtherUser ? currentUnread + 1 : currentUnread;

          const updatedConversation: Conversation = {
            ...current,
            unreadCount: nextUnread,
            unreadCounts: {
              ...(current.unreadCounts || {}),
              [userId]: nextUnread,
            },
            lastMessage: {
              content: payload.content,
              type: payload.type,
              senderId,
              sentAt,
            },
            updatedAt: sentAt,
          };

          const withoutCurrent = [...prev.slice(0, idx), ...prev.slice(idx + 1)];
          return [updatedConversation, ...withoutCurrent];
        });
      }
    };

    const handleSocketReconnect = () => {
      void loadConversations();
    };

    const handleMessageDeletedForMe = (payload: MessageDeletedForMeEvent) => {
      if (!payload?.conversationId) {
        return;
      }

      void loadConversations();
    };

    const handleMessageRecalled = (payload: MessageRecalledEvent) => {
      if (!payload?.conversationId) {
        return;
      }

      void loadConversations();
    };

    const handleGroupUpdated = (payload: GroupUpdatedEvent) => {
      if (!payload?.groupId) return;

      if (payload.type === 'member_added') {
        const memberIds = Array.isArray(payload.data?.memberIds) ? payload.data?.memberIds : [];
        if (memberIds.includes(userId)) {
          void loadConversations();
        }
      }

      if (payload.type === 'disbanded') {
        setConversations((prev) => prev.filter((conversation) => conversation._id !== payload.groupId));
        return;
      }

      if (payload.type === 'member_removed' && payload.data?.userId === userId) {
        setConversations((prev) => prev.filter((conversation) => conversation._id !== payload.groupId));
        return;
      }

      if (payload.type !== 'name_changed' && payload.type !== 'avatar_changed') return;

      setConversations((prev) => prev.map((conversation) => {
        if (conversation._id !== payload.groupId) {
          return conversation;
        }

        return {
          ...conversation,
          name: payload.data?.name ?? conversation.name,
          avatarUrl: payload.data?.avatarUrl ?? conversation.avatarUrl,
        };
      }));
    };

    socket.on('receive_message', handleNewMessage);
    socket.on('message_recalled', handleMessageRecalled);
    socket.on('message_deleted_for_me', handleMessageDeletedForMe);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('connect', handleSocketReconnect);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('message_recalled', handleMessageRecalled);
      socket.off('message_deleted_for_me', handleMessageDeletedForMe);
      socket.off('group_updated', handleGroupUpdated);
      socket.off('connect', handleSocketReconnect);
    };
  }, [loadConversations, userId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadConversations();
  }, [loadConversations]);

  const openChatRoom = (conv: Conversation) => {
    router.push({
      pathname: '/chat-room',
      params: {
        conversationId: conv._id,
        name: getConversationName(conv, userId),
        avatarUrl: conv.avatarUrl || '',
        isGroup: conv.type === 'group' ? 'true' : 'false',
      },
    });
  };

  const normalizedSearch = searchQuery.trim().toLowerCase();
  const isSearchMode = normalizedSearch.length > 0;

  // Collect peer user IDs from 1-1 conversations for presence tracking
  const peerIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conv of conversations) {
      if (conv.type !== 'group') {
        for (const u of conv.users ?? []) {
          if (u._id !== userId) ids.add(u._id);
        }
      }
    }
    return Array.from(ids);
  }, [conversations, userId]);

  const { getPresence } = usePresence(peerIds);

  const searchTargets = useMemo<SearchTarget[]>(() => {
    if (!isSearchMode) {
      return [];
    }

    const targets: SearchTarget[] = [];

    const seenGroupIds = new Set<string>();
    for (const conversation of conversations) {
      if (conversation.type !== 'group') {
        continue;
      }

      const name = getConversationName(conversation, userId);
      if (!name.toLowerCase().includes(normalizedSearch)) {
        continue;
      }

      if (seenGroupIds.has(conversation._id)) {
        continue;
      }

      seenGroupIds.add(conversation._id);
      targets.push({
        key: `group-${conversation._id}`,
        type: 'group',
        id: conversation._id,
        name,
        avatarUrl: conversation.avatarUrl,
        conversationId: conversation._id,
      });
    }

    const seenFriendIds = new Set<string>();
    for (const friend of allFriends) {
      if (seenFriendIds.has(friend.id)) {
        continue;
      }

      if (!friend.displayName.toLowerCase().includes(normalizedSearch)) {
        continue;
      }

      seenFriendIds.add(friend.id);
      targets.push({
        key: `friend-${friend.id}`,
        type: 'friend',
        id: friend.id,
        name: friend.displayName,
        avatarUrl: friend.avatarUrl,
      });
    }

    return targets;
  }, [allFriends, conversations, isSearchMode, normalizedSearch, userId]);

  const openSearchTarget = useCallback(async (target: SearchTarget) => {
    if (target.type === 'group') {
      const groupConversation = conversations.find((conversation) => conversation._id === target.conversationId);
      if (groupConversation) {
        openChatRoom(groupConversation);
      }
      return;
    }

    const existingDirect = conversations.find((conversation) => (
      conversation.type !== 'group'
      && conversation.users?.some((member) => member._id === target.id)
    ));

    if (existingDirect) {
      openChatRoom(existingDirect);
      return;
    }

    try {
      const response = await api.post('/conversations/direct', { targetUserId: target.id });
      const conversation = response.data?.data as Conversation | undefined;
      if (!conversation?._id) {
        return;
      }

      setConversations((prev) => {
        const exists = prev.some((item) => item._id === conversation._id);
        if (exists) {
          return prev.map((item) => (item._id === conversation._id ? { ...item, ...conversation } : item));
        }
        return [conversation, ...prev];
      });

      joinAllConversations([conversation]);
      openChatRoom(conversation);
    } catch (err: any) {
      const message = err?.response?.data?.error;
      Alert.alert('Thong bao', typeof message === 'string' ? message : 'Khong the mo hoi thoai luc nay.');
    }
  }, [conversations, joinAllConversations, openChatRoom]);

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        getConversationName(c, userId).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  const pinnedSet = new Set(pinnedConversationIds);
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const aPinned = pinnedSet.has(a._id) ? 1 : 0;
    const bPinned = pinnedSet.has(b._id) ? 1 : 0;
    if (aPinned !== bPinned) {
      return bPinned - aPinned;
    }

    const aTs = new Date(a.lastMessage?.sentAt || a.updatedAt || 0).getTime();
    const bTs = new Date(b.lastMessage?.sentAt || b.updatedAt || 0).getTime();
    return bTs - aTs;
  });

  const listData: ChatListItem[] = isSearchMode ? searchTargets : sortedConversations;
  const s = useStyles(theme);

  return (
    <LinearGradient
      colors={[theme.backgroundSoft, theme.backgroundMid, theme.backgroundDeep]}
      style={s.safeArea}
    >
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Tin nhắn</Text>
          <TouchableOpacity style={s.actionBtn}>
            <Ionicons name="create-outline" size={24} color={theme.accent} />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={s.searchContainer}>
          <Ionicons name="search-outline" size={20} color={theme.textTertiary} style={s.searchIcon} />
          <TextInput
            style={s.searchInput}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            placeholderTextColor={theme.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Chat List */}
        {isLoading ? (
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={s.loadingText}>Đang tải hội thoại...</Text>
          </View>
        ) : (
          <FlatList<ChatListItem>
            data={listData}
            keyExtractor={(item) => (isSearchTarget(item) ? item.key : item._id)}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.accent}
                colors={[theme.accent]}
              />
            }
            renderItem={({ item }) => {
              if (isSearchTarget(item)) {
                const target = item;
                return (
                  <TouchableOpacity style={s.chatItem} onPress={() => { void openSearchTarget(target); }}>
                    <View style={s.avatarContainer}>
                      <View style={[s.avatar, target.type === 'group' && s.groupAvatar]}>
                        {target.avatarUrl ? (
                          <Image source={{ uri: target.avatarUrl }} style={s.avatarImage} resizeMode="cover" />
                        ) : (
                          <Text style={s.avatarText}>{target.name.charAt(0).toUpperCase()}</Text>
                        )}
                        {target.type === 'group' && (
                          <View style={s.groupBadge}>
                            <Ionicons name="people" size={10} color={theme.textOnAccent} />
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={s.chatInfo}>
                      <View style={s.chatHeader}>
                        <Text style={s.chatName}>{target.name}</Text>
                      </View>
                      <View style={s.chatFooter}>
                        <Text style={s.lastMsg} numberOfLines={1}>
                          {target.type === 'group' ? 'Nhom' : 'Ban be'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }

              const conversationItem = item;
              const displayName = getConversationName(conversationItem, userId);
              const unread = conversationItem.unreadCount ?? conversationItem.unreadCounts?.[userId] ?? 0;
              const hasUnread = unread > 0;

              return (
                <TouchableOpacity style={s.chatItem} onPress={() => openChatRoom(conversationItem)}>
                  <View style={s.avatarContainer}>
                    <View style={[s.avatar, conversationItem.type === 'group' && s.groupAvatar]}>
                      {conversationItem.avatarUrl ? (
                        <Image source={{ uri: conversationItem.avatarUrl }} style={s.avatarImage} resizeMode="cover" />
                      ) : (
                        <Text style={s.avatarText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                      {conversationItem.type !== 'group' && (() => {
                        const peerId = conversationItem.users?.find((u) => u._id !== userId)?._id;
                        const presence = peerId ? getPresence(peerId) : undefined;
                        return presence?.online ? (
                          <View style={s.onlineDot} />
                        ) : null;
                      })()}
                      {conversationItem.type === 'group' && (
                        <View style={s.groupBadge}>
                          <Ionicons name="people" size={10} color={theme.textOnAccent} />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={s.chatInfo}>
                    <View style={s.chatHeader}>
                      <Text style={[s.chatName, hasUnread && s.chatNameBold]}>
                        {displayName}
                      </Text>
                      <View style={s.timeColumn}>
                        <Text style={[s.chatTime, hasUnread && s.chatTimeActive]}>
                          {formatRelativeTime(conversationItem.lastMessage?.sentAt || conversationItem.updatedAt)}
                        </Text>
                        {pinnedSet.has(conversationItem._id) && (
                          <View style={s.pinBadge}>
                            <Ionicons name="pin" size={10} color={theme.accentLight} />
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={s.chatFooter}>
                      <Text
                        style={[s.lastMsg, hasUnread && s.lastMsgBold]}
                        numberOfLines={1}
                      >
                        {getLastMessagePreview(conversationItem.lastMessage)}
                      </Text>
                      {hasUnread && (
                        <View style={s.unreadBadge}>
                          <Text style={s.unreadText}>
                            {unread > 99 ? '99+' : unread}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={s.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={theme.textTertiary} />
                <Text style={s.emptyTitle}>{isSearchMode ? 'Khong tim thay ket qua' : 'Chưa có cuộc trò chuyện'}</Text>
                <Text style={s.emptySubtext}>{isSearchMode ? 'Thu tim voi tu khoa khac.' : 'Bắt đầu trò chuyện với bạn bè nhé!'}</Text>
              </View>
            }
            contentContainerStyle={(isSearchMode ? searchTargets.length : sortedConversations.length) === 0 ? { flex: 1 } : { paddingBottom: 100 }}
          />
        )}
      </View>
    </SafeAreaView>
   </LinearGradient>
  );
}

const useStyles = (theme: ReturnType<typeof getAppTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 29 },
    container: { flex: 1, paddingHorizontal: 20 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 20,
    },
    title: {
      color: theme.textPrimary,
      fontSize: 24,
      fontFamily: 'BeVietnamPro_700Bold',
    },
    actionBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.glassPanel ?? colors.glassPanel,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.glassBorder ?? colors.glassBorder,
    },
    searchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.glassPanel ?? colors.glassPanel,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.glassBorder ?? colors.glassBorder,
      paddingHorizontal: 15,
      height: 45,
      marginBottom: 20,
    },
    searchIcon: { marginRight: 10 },
    searchInput: {
      flex: 1,
      color: theme.textPrimary,
      fontFamily: 'BeVietnamPro_400Regular',
      fontSize: 15,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      color: theme.textTertiary,
      fontFamily: 'BeVietnamPro_400Regular',
      marginTop: 12,
      fontSize: 14,
    },
    chatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 16,
      backgroundColor: theme.glassSoft ?? colors.glassSoft,
      borderWidth: 1,
      borderColor: theme.glassBorderSoft ?? colors.glassBorderSoft,
    },
    avatarContainer: { position: 'relative' },
    avatar: {
      width: 55,
      height: 55,
      borderRadius: 20,
      backgroundColor: theme.glassPanelStrong ?? colors.glassPanelStrong,
      justifyContent: 'center',
      alignItems: 'center',
    },
    groupAvatar: {
      backgroundColor: theme.glassSoft ?? colors.glassSoft,
    },
    avatarText: {
      color: theme.textTertiary,
      fontSize: 18,
      fontFamily: 'BeVietnamPro_700Bold',
    },
    groupBadge: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.info,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: theme.bgCard,
    },
    onlineDot: {
      position: 'absolute',
      bottom: -2,
      right: -2,
      width: 14,
      height: 14,
      borderRadius: 7,
      backgroundColor: theme.accent,
      borderWidth: 2,
      borderColor: theme.bgCard,
    },
    chatInfo: { flex: 1, marginLeft: 15 },
    chatHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 5,
    },
    timeColumn: { alignItems: 'flex-end' },
    chatName: {
      color: theme.textPrimary,
      fontSize: 16,
      fontFamily: 'BeVietnamPro_500Medium',
    },
    chatNameBold: { fontFamily: 'BeVietnamPro_700Bold' },
    chatTime: {
      color: theme.textTertiary,
      fontSize: 12,
      fontFamily: 'BeVietnamPro_400Regular',
    },
    chatTimeActive: { color: theme.accent },
    pinBadge: {
      marginTop: 3,
      borderRadius: 8,
      backgroundColor: theme.glassSoft,
      paddingHorizontal: 5,
      paddingVertical: 2,
    },
    chatFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    lastMsg: {
      color: theme.textTertiary,
      fontSize: 14,
      fontFamily: 'BeVietnamPro_400Regular',
      flex: 1,
      marginRight: 10,
    },
    lastMsgBold: {
      color: theme.textSecondary,
      fontFamily: 'BeVietnamPro_500Medium',
    },
    unreadBadge: {
      backgroundColor: theme.accent,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 6,
    },
    unreadText: {
      color: theme.textOnAccent,
      fontSize: 11,
      fontFamily: 'BeVietnamPro_700Bold',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    emptyTitle: {
      color: theme.textTertiary,
      fontSize: 16,
      fontFamily: 'BeVietnamPro_600SemiBold',
      marginTop: 16,
    },
    emptySubtext: {
      color: theme.textTertiary,
      fontSize: 14,
      fontFamily: 'BeVietnamPro_400Regular',
      marginTop: 4,
    },
  });

