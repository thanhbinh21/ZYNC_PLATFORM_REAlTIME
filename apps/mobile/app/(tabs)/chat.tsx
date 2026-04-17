import React, { useEffect, useState, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme/colors';
import api from '../../src/services/api';
import { socketService } from '../../src/services/socket';
import { useAuthStore } from '../../src/store/useAuthStore';

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

interface IncomingMessageEvent {
  conversationId?: string;
  senderId?: string | { _id?: string };
  content?: string;
  type?: string;
  createdAt?: string;
}

interface GroupUpdatedEvent {
  groupId?: string;
  type?: 'created' | 'name_changed' | 'avatar_changed' | 'member_added' | 'member_removed' | 'role_changed' | 'member_approval_changed' | 'disbanded';
  data?: {
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
  const userInfo = useAuthStore((s) => s.userInfo);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const userId = String(userInfo?._id || userInfo?.id || '');

  const [conversations, setConversations] = useState<Conversation[]>([]);
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
      const res = await api.get('/conversations');
      const items = Array.isArray(res.data?.data) ? (res.data.data as Conversation[]) : [];

      setConversations(items);
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

    const handleGroupUpdated = (payload: GroupUpdatedEvent) => {
      if (!payload?.groupId) return;
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
    socket.on('message_recalled', handleNewMessage);
    socket.on('message_deleted_for_me', handleNewMessage);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('connect', handleSocketReconnect);

    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('message_recalled', handleNewMessage);
      socket.off('message_deleted_for_me', handleNewMessage);
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

  const filteredConversations = searchQuery
    ? conversations.filter((c) =>
        getConversationName(c, userId).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : conversations;

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Tin nhắn</Text>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="create-outline" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm cuộc trò chuyện..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Chat List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Đang tải hội thoại...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item._id}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#10b981"
                colors={['#10b981']}
              />
            }
            renderItem={({ item }) => {
              const displayName = getConversationName(item, userId);
              const unread = item.unreadCount ?? item.unreadCounts?.[userId] ?? 0;
              const hasUnread = unread > 0;

              return (
                <TouchableOpacity style={styles.chatItem} onPress={() => openChatRoom(item)}>
                  <View style={styles.avatarContainer}>
                    <View style={[styles.avatar, item.type === 'group' && styles.groupAvatar]}>
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.avatarText}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                      {item.type === 'group' && (
                        <View style={styles.groupBadge}>
                          <Ionicons name="people" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                      <Text style={[styles.chatName, hasUnread && styles.chatNameBold]}>
                        {displayName}
                      </Text>
                      <Text style={[styles.chatTime, hasUnread && styles.chatTimeActive]}>
                        {formatRelativeTime(item.lastMessage?.sentAt || item.updatedAt)}
                      </Text>
                    </View>
                    <View style={styles.chatFooter}>
                      <Text
                        style={[styles.lastMsg, hasUnread && styles.lastMsgBold]}
                        numberOfLines={1}
                      >
                        {getLastMessagePreview(item.lastMessage)}
                      </Text>
                      {hasUnread && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>
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
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color="#334155" />
                <Text style={styles.emptyTitle}>Chưa có cuộc trò chuyện</Text>
                <Text style={styles.emptySubtext}>Bắt đầu trò chuyện với bạn bè nhé!</Text>
              </View>
            }
            contentContainerStyle={filteredConversations.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
          />
        )}
      </View>
    </SafeAreaView>
   </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 29,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassPanel,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassPanel,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15,
  },
  // ─ Loading ─
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#64748b',
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 12,
    fontSize: 14,
  },
  // ─ Chat Items ─
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 20,
    backgroundColor: colors.glassPanelStrong,
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupAvatar: {
    backgroundColor: colors.glassSoft,
  },
  avatarText: {
    color: '#94a3b8',
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
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
  },
  chatInfo: {
    flex: 1,
    marginLeft: 15,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  chatNameBold: {
    fontFamily: 'BeVietnamPro_700Bold',
  },
  chatTime: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  chatTimeActive: {
    color: '#10b981',
  },
  chatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMsg: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
    flex: 1,
    marginRight: 10,
  },
  lastMsgBold: {
    color: '#e2e8f0',
    fontFamily: 'BeVietnamPro_500Medium',
  },
  unreadBadge: {
    backgroundColor: '#10b981',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  // ─ Empty State ─
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#475569',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 4,
  },
});

