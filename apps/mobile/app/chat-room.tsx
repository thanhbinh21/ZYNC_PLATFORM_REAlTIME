import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/useAuthStore';
import { socketService } from '../src/services/socket';
import api from '../src/services/api';
import { colors } from '../src/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';

// ───────────────── Types ─────────────────
interface Message {
  _id: string;
  senderId: string | { _id: string; displayName?: string };
  content?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
  mediaUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
  createdAt: string;
  idempotencyKey?: string;
}

// ───────────────── Helpers ─────────────────
function getSenderId(msg: Message): string {
  if (typeof msg.senderId === 'object' && msg.senderId !== null) return msg.senderId._id;
  return msg.senderId as string;
}

function getSenderName(msg: Message): string {
  if (typeof msg.senderId === 'object' && msg.senderId !== null) return msg.senderId.displayName || 'User';
  return '';
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ───────────────── Status Ticks Component ─────────────────
function MessageStatusTicks({ status }: { status?: string }) {
  if (!status) return null;

  let iconName: 'checkmark' | 'checkmark-done' = 'checkmark';
  let color = '#64748b';

  switch (status) {
    case 'sent':
      iconName = 'checkmark';
      color = '#64748b';
      break;
    case 'delivered':
      iconName = 'checkmark-done';
      color = '#64748b';
      break;
    case 'read':
      iconName = 'checkmark-done';
      color = '#10b981';
      break;
  }

  return <Ionicons name={iconName} size={14} color={color} style={{ marginLeft: 4 }} />;
}

// ───────────────── Typing Indicator ─────────────────
function TypingIndicator({ typingUsers }: { typingUsers: string[] }) {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingUsers.length === 0) return;

    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -6, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );

    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [typingUsers.length]);

  if (typingUsers.length === 0) return null;

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: dot3 }] }]} />
      </View>
      <Text style={typingStyles.text}>
        {typingUsers.length === 1 ? 'đang nhập...' : `${typingUsers.length} người đang nhập...`}
      </Text>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94a3b8',
    marginHorizontal: 2,
  },
  text: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
  },
});

// ───────────────── Chat Room Screen ─────────────────
export default function ChatRoomScreen() {
  const router = useRouter();
  const { conversationId, name, isGroup } = useLocalSearchParams<{
    conversationId: string;
    name: string;
    isGroup?: string;
  }>();

  const userInfo = useAuthStore((s) => s.userInfo);
  const userId = userInfo?._id || userInfo?.id || '';

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ── Load message history ──
  useEffect(() => {
    if (!conversationId) return;

    const loadMessages = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/messages/${conversationId}`, {
          params: { limit: 50 },
        });
        if (res.data?.success && res.data?.messages) {
          // API returns newest first, we reverse for FlatList inverted
          setMessages(res.data.messages.reverse());
        }
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadMessages();
  }, [conversationId]);

  // ── Socket real-time listeners ──
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !conversationId) return;

    // Join the conversation room
    socket.emit('join_conversation', { conversationId });

    const handleReceiveMessage = (msg: Message) => {
      // Only add messages for this conversation
      setMessages((prev) => {
        // Check for duplicate by idempotencyKey or _id
        const isDuplicate = prev.some(
          (m) => m._id === msg._id || (msg.idempotencyKey && m.idempotencyKey === msg.idempotencyKey)
        );
        if (isDuplicate) return prev;
        return [...prev, msg];
      });

      // Mark as delivered
      if (getSenderId(msg) !== userId) {
        socket.emit('message_delivered', {
          conversationId,
          messageIds: [msg._id],
        });
      }
    };

    const handleStatusUpdate = (data: { messageId: string; status: string; userId: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, status: data.status as Message['status'] } : m
        )
      );
    };

    const handleTypingIndicator = (data: { userId: string; conversationId: string; isTyping: boolean }) => {
      if (data.conversationId !== conversationId || data.userId === userId) return;

      setTypingUsers((prev) => {
        if (data.isTyping) {
          return prev.includes(data.userId) ? prev : [...prev, data.userId];
        }
        return prev.filter((id) => id !== data.userId);
      });
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('status_update', handleStatusUpdate);
    socket.on('typing_indicator', handleTypingIndicator);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('status_update', handleStatusUpdate);
      socket.off('typing_indicator', handleTypingIndicator);
    };
  }, [conversationId, userId]);

  // ── Mark messages as read when screen opens ──
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    const unreadMessageIds = messages
      .filter((m) => getSenderId(m) !== userId && m.status !== 'read')
      .map((m) => m._id);

    if (unreadMessageIds.length > 0) {
      const socket = socketService.getSocket();
      socket?.emit('message_read', { conversationId, messageIds: unreadMessageIds });
    }
  }, [messages, conversationId, userId]);

  // ── Send message ──
  const handleSend = useCallback(() => {
    if (!inputText.trim() || isSending) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const idempotencyKey = generateUUID();
    const optimisticMsg: Message = {
      _id: idempotencyKey,
      senderId: userId,
      content: inputText.trim(),
      type: 'text',
      status: 'sent',
      createdAt: new Date().toISOString(),
      idempotencyKey,
    };

    // Optimistic update
    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    // Stop typing
    if (isTypingRef.current) {
      socket.emit('typing_stop', { conversationId });
      isTypingRef.current = false;
    }

    // Emit via socket
    socket.emit('send_message', {
      conversationId,
      content: optimisticMsg.content,
      type: 'text',
      idempotencyKey,
    });
  }, [inputText, isSending, conversationId, userId]);

  // ── Typing indicator ──
  const handleTextChange = (text: string) => {
    setInputText(text);

    const socket = socketService.getSocket();
    if (!socket) return;

    if (!isTypingRef.current && text.length > 0) {
      socket.emit('typing_start', { conversationId });
      isTypingRef.current = true;
    }

    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        socket.emit('typing_stop', { conversationId });
        isTypingRef.current = false;
      }
    }, 2000);
  };

  // ── Render a message bubble ──
  const renderMessage = useCallback(
    ({ item: msg }: { item: Message }) => {
      const isMe = getSenderId(msg) === userId;
      const isGroupChat = isGroup === 'true';

      return (
        <View style={[bubbleStyles.row, isMe ? bubbleStyles.rowRight : bubbleStyles.rowLeft]}>
          {/* Avatar for others in group */}
          {!isMe && isGroupChat && (
            <View style={bubbleStyles.otherAvatar}>
              <Text style={bubbleStyles.avatarLetter}>
                {getSenderName(msg).charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}

          <View style={{ maxWidth: '75%' }}>
            {/* Sender name in group */}
            {!isMe && isGroupChat && (
              <Text style={bubbleStyles.senderName}>{getSenderName(msg)}</Text>
            )}

            <View style={[bubbleStyles.bubble, isMe ? bubbleStyles.bubbleMe : bubbleStyles.bubbleOther]}>
              {/* Text content */}
              {msg.type === 'text' && msg.content ? (
                <Text style={[bubbleStyles.msgText, isMe && bubbleStyles.msgTextMe]}>{msg.content}</Text>
              ) : msg.type === 'image' ? (
                <View style={bubbleStyles.mediaPlaceholder}>
                  <Ionicons name="image-outline" size={28} color={isMe ? '#111827' : '#94a3b8'} />
                  <Text style={[bubbleStyles.mediaLabel, isMe && { color: '#111827' }]}>Ảnh</Text>
                </View>
              ) : msg.type === 'file' ? (
                <View style={bubbleStyles.mediaPlaceholder}>
                  <Ionicons name="document-outline" size={28} color={isMe ? '#111827' : '#94a3b8'} />
                  <Text style={[bubbleStyles.mediaLabel, isMe && { color: '#111827' }]}>Tệp đính kèm</Text>
                </View>
              ) : (
                <Text style={[bubbleStyles.msgText, isMe && bubbleStyles.msgTextMe]}>
                  {msg.content || '[Media]'}
                </Text>
              )}

              {/* Time + Status */}
              <View style={bubbleStyles.meta}>
                <Text style={[bubbleStyles.time, isMe && bubbleStyles.timeMe]}>
                  {formatTime(msg.createdAt)}
                </Text>
                {isMe && <MessageStatusTicks status={msg.status} />}
              </View>
            </View>
          </View>
        </View>
      );
    },
    [userId, isGroup]
  );

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <View style={styles.headerAvatar}>
              <Text style={styles.headerAvatarText}>
                {(name || 'C').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={styles.headerName} numberOfLines={1}>
                {name || 'Chat'}
              </Text>
              {typingUsers.length > 0 ? (
                <Text style={styles.headerStatus}>đang nhập...</Text>
              ) : (
                <Text style={styles.headerStatus}>Online</Text>
              )}
            </View>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionIcon}>
              <Ionicons name="call-outline" size={22} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Ionicons name="videocam-outline" size={22} color="#10b981" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionIcon}>
              <Ionicons name="information-circle-outline" size={22} color="#10b981" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Message List ── */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
            <Text style={styles.loadingText}>Đang tải tin nhắn...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item._id}
            renderItem={renderMessage}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubble-ellipses-outline" size={64} color="#334155" />
                <Text style={styles.emptyText}>Chưa có tin nhắn nào</Text>
                <Text style={styles.emptySubtext}>Hãy gửi lời chào đầu tiên! 👋</Text>
              </View>
            }
          />
        )}

        {/* ── Typing Indicator ── */}
        <TypingIndicator typingUsers={typingUsers} />

        {/* ── Input Bar ── */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.inputAction}>
            <Ionicons name="add-circle-outline" size={26} color="#64748b" />
          </TouchableOpacity>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập tin nhắn..."
              placeholderTextColor="#64748b"
              value={inputText}
              onChangeText={handleTextChange}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity style={styles.emojiBtn}>
              <Ionicons name="happy-outline" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>
          {inputText.trim() ? (
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Ionicons name="send" size={20} color="#111827" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.micBtn}>
              <Ionicons name="mic-outline" size={24} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
   </LinearGradient>
  );
}

// ───────────────── Bubble Styles ─────────────────
const bubbleStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  rowLeft: {
    justifyContent: 'flex-start',
  },
  rowRight: {
    justifyContent: 'flex-end',
  },
  otherAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    marginTop: 16,
  },
  avatarLetter: {
    color: '#94a3b8',
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 13,
  },
  senderName: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
    marginBottom: 2,
    marginLeft: 12,
  },
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 60,
  },
  bubbleMe: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 6,
  },
  msgText: {
    color: '#e2e8f0',
    fontSize: 15,
    fontFamily: 'BeVietnamPro_400Regular',
    lineHeight: 22,
  },
  msgTextMe: {
    color: '#111827',
  },
  mediaPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mediaLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  time: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  timeMe: {
    color: 'rgba(17,24,39,0.6)',
  },
});

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  // ─ Header ─
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'rgba(2, 22, 18, 0.4)',
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerAvatarText: {
    color: '#94a3b8',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  headerName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
    maxWidth: 140,
  },
  headerStatus: {
    color: '#10b981',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ─ Message List ─
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
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
  // ─ Input Bar ─
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.surfaceHover,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
  inputAction: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginHorizontal: 8,
    maxHeight: 120,
  },
  textInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15,
    lineHeight: 20,
    paddingVertical: 6,
    minHeight: 32,
  },
  emojiBtn: {
    padding: 4,
    marginBottom: 2,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
});
