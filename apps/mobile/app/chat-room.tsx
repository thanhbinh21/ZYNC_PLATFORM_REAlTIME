import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StatusBar,
  ActivityIndicator,
  Animated,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAuthStore } from '../src/store/useAuthStore';
import { socketService } from '../src/services/socket';
import api from '../src/services/api';
import { colors } from '../src/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

interface Message {
  _id: string;
  conversationId?: string;
  senderId: string | { _id: string; displayName?: string };
  content?: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'sticker' | 'system-recall' | `file/${string}`;
  mediaUrl?: string;
  status?: 'sent' | 'delivered' | 'read';
  createdAt: string;
  idempotencyKey?: string;
}

const FILE_PREFIX = 'file/';

function isFileType(type: string): type is `file/${string}` {
  return type.startsWith(FILE_PREFIX);
}

function normalizeMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const rawId = data._id ?? data.messageId ?? data.idempotencyKey;
  if (!rawId) {
    return null;
  }

  const sender = data.senderId;
  let normalizedSender: Message['senderId'];

  if (typeof sender === 'string') {
    normalizedSender = sender;
  } else if (sender && typeof sender === 'object' && '_id' in sender) {
    const senderObject = sender as Record<string, unknown>;
    normalizedSender = {
      _id: String(senderObject._id),
      displayName: typeof senderObject.displayName === 'string' ? senderObject.displayName : undefined,
    };
  } else {
    return null;
  }

  const rawType = typeof data.type === 'string' ? data.type : 'text';
  const normalizedType = rawType === 'file'
    ? `file/${typeof data.content === 'string' && data.content.trim() ? data.content.trim() : 'attachment'}`
    : rawType;

  const rawStatus = data.status;
  const status: Message['status'] =
    rawStatus === 'sent' || rawStatus === 'delivered' || rawStatus === 'read'
      ? rawStatus
      : undefined;

  return {
    _id: String(rawId),
    conversationId: typeof data.conversationId === 'string' ? data.conversationId : undefined,
    senderId: normalizedSender,
    content: typeof data.content === 'string' ? data.content : '',
    type: normalizedType as Message['type'],
    mediaUrl: typeof data.mediaUrl === 'string' ? data.mediaUrl : undefined,
    status,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date().toISOString(),
    idempotencyKey: typeof data.idempotencyKey === 'string' ? data.idempotencyKey : undefined,
  };
}

function dedupeMessages(messages: Message[]): Message[] {
  const unique = new Map<string, Message>();

  for (const message of messages) {
    const key = message.idempotencyKey || message._id;
    unique.set(key, message);
  }

  return Array.from(unique.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function getSenderId(msg: Message): string {
  if (msg.senderId && typeof msg.senderId === 'object' && '_id' in msg.senderId) {
    return String(msg.senderId._id);
  }
  return String(msg.senderId || '');
}

function getSenderName(msg: Message): string {
  if (typeof msg.senderId === 'object' && msg.senderId !== null) {
    return msg.senderId.displayName || 'User';
  }
  return '';
}

function getFileName(type: Message['type'], content?: string): string {
  if (isFileType(type)) {
    const encodedName = type.slice(FILE_PREFIX.length);
    try {
      return decodeURIComponent(encodedName) || 'Tep dinh kem';
    } catch {
      return encodedName || 'Tep dinh kem';
    }
  }

  return content?.trim() || 'Tep dinh kem';
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

function MessageStatusTicks({ status }: { status?: string }) {
  if (!status) return null;

  let iconName: 'checkmark' | 'checkmark-done' = 'checkmark';
  let color = '#64748b';

  switch (status) {
    case 'delivered':
      iconName = 'checkmark-done';
      break;
    case 'read':
      iconName = 'checkmark-done';
      break;
    default:
      break;
  }

  return <Ionicons name={iconName} size={14} color={color} style={{ marginLeft: 4 }} />;
}

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
        ]),
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
  }, [typingUsers.length, dot1, dot2, dot3]);

  if (typingUsers.length === 0) return null;

  return (
    <View style={typingStyles.container}>
      <View style={typingStyles.bubble}>
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: dot1 }] }]} />
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: dot2 }] }]} />
        <Animated.View style={[typingStyles.dot, { transform: [{ translateY: dot3 }] }]} />
      </View>
      <Text style={typingStyles.text}>
        {typingUsers.length === 1 ? 'dang nhap...' : `${typingUsers.length} nguoi dang nhap...`}
      </Text>
    </View>
  );
}

function VideoMessage({
  mediaUrl,
  isMe,
  onOpenMedia,
}: {
  mediaUrl?: string;
  isMe: boolean;
  onOpenMedia: (url?: string) => Promise<void>;
}) {
  const [started, setStarted] = useState(false);
  const player = useVideoPlayer(mediaUrl || null, (current) => {
    current.pause();
  });

  if (!mediaUrl) {
    return (
      <View style={[bubbleStyles.fileCard, isMe && bubbleStyles.fileCardMe]}>
        <Ionicons name="videocam-outline" size={22} color={isMe ? '#0f172a' : '#94a3b8'} />
        <View style={bubbleStyles.fileMeta}>
          <Text style={[bubbleStyles.fileTitle, isMe && bubbleStyles.fileTitleMe]}>Video</Text>
          <Text style={[bubbleStyles.fileAction, isMe && bubbleStyles.fileActionMe]}>Khong co lien ket</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={bubbleStyles.videoContainer}>
      <VideoView
        style={bubbleStyles.mediaVideo}
        player={player}
        nativeControls
        contentFit="cover"
        fullscreenOptions={{ enable: true }}
        allowsPictureInPicture
      />
      {!started && (
        <Pressable
          onPress={() => {
            player.play();
            setStarted(true);
          }}
          style={bubbleStyles.videoOverlay}
        >
          <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.96)" />
        </Pressable>
      )}
      <TouchableOpacity
        onPress={() => {
          void onOpenMedia(mediaUrl);
        }}
        style={[bubbleStyles.videoOpenBtn, isMe && bubbleStyles.videoOpenBtnMe]}
      >
        <Ionicons name="open-outline" size={14} color={isMe ? '#0f172a' : '#a5f3fc'} />
        <Text style={[bubbleStyles.videoOpenText, isMe && bubbleStyles.videoOpenTextMe]}>Mo toan man hinh</Text>
      </TouchableOpacity>
    </View>
  );
}

const typingStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
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

export default function ChatRoomScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { conversationId, name, isGroup } = useLocalSearchParams<{
    conversationId: string;
    name: string;
    isGroup?: string;
  }>();

  const userInfo = useAuthStore((s) => s.userInfo);
  const userId = String(userInfo?._id || userInfo?.id || '');

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMoreLoading, setIsMoreLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showOptionsId, setShowOptionsId] = useState<string | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  const scrollToBottom = useCallback((animated = true) => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showSub = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const loadMessages = useCallback(async (cursor?: string | null) => {
    if (!conversationId) return;

    try {
      if (cursor) setIsMoreLoading(true);
      else setIsLoading(true);

      const res = await api.get(`/messages/${conversationId}`, {
        params: { limit: 20, cursor: cursor || undefined },
      });

      const rawMessages = Array.isArray(res.data?.messages) ? res.data.messages : [];
      const normalizedMessages = rawMessages
        .map((raw: unknown) => normalizeMessage(raw))
        .filter((message: Message | null): message is Message => Boolean(message));
      const ascendingMessages = normalizedMessages.reverse();

      setMessages((prev) => {
        const merged = cursor ? [...ascendingMessages, ...prev] : ascendingMessages;
        return dedupeMessages(merged);
      });

      setHasMore(Boolean(res.data?.hasMore));
      setNextCursor(typeof res.data?.nextCursor === 'string' ? res.data.nextCursor : null);

      if (!cursor) {
        setTimeout(() => scrollToBottom(false), 60);
      }
    } catch (err: any) {
      console.error('[ERROR] Failed to load messages:', err?.response?.data || err?.message || err);
    } finally {
      setIsLoading(false);
      setIsMoreLoading(false);
    }
  }, [conversationId, scrollToBottom]);

  useFocusEffect(
    useCallback(() => {
      setMessages([]);
      setNextCursor(null);
      setHasMore(true);
      setShowOptionsId(null);
      void loadMessages();

      return () => {
        setShowOptionsId(null);
      };
    }, [loadMessages]),
  );

  const handleLoadMore = useCallback(() => {
    if (!hasMore || isMoreLoading || isLoading || !nextCursor) return;
    void loadMessages(nextCursor);
  }, [hasMore, isMoreLoading, isLoading, nextCursor, loadMessages]);

  const handleScrollList = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y < 120) {
      handleLoadMore();
    }
  }, [handleLoadMore]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket || !conversationId) return;

    const joinConversationRoom = () => {
      socket.emit('join_conversation', { conversationId });
    };

    if (socket.connected) {
      joinConversationRoom();
    }

    const handleReceiveMessage = (payload: unknown) => {
      const message = normalizeMessage(payload);
      if (!message) return;
      if (message.conversationId && message.conversationId !== conversationId) return;

      setMessages((prev) => {
        const isDuplicate = prev.some(
          (item) => item._id === message._id || (message.idempotencyKey && item.idempotencyKey === message.idempotencyKey),
        );
        if (isDuplicate) return prev;
        return dedupeMessages([...prev, message]);
      });

      if (getSenderId(message) !== userId) {
        socket.emit('message_delivered', {
          conversationId,
          messageIds: [message._id],
        });
      }

      setTimeout(() => scrollToBottom(), 80);
    };

    const handleStatusUpdate = (data: {
      messageId?: string;
      messageIds?: string[];
      idempotencyKeys?: string[];
      status?: Message['status'];
    }) => {
      if (!data.status) return;

      const messageIds = Array.isArray(data.messageIds) ? data.messageIds.map(String) : [];
      if (data.messageId) {
        messageIds.push(String(data.messageId));
      }
      const idempotencyKeys = Array.isArray(data.idempotencyKeys)
        ? data.idempotencyKeys.map(String)
        : [];

      if (messageIds.length === 0 && idempotencyKeys.length === 0) {
        return;
      }

      setMessages((prev) => prev.map((message) => {
        const matchedById = messageIds.includes(message._id);
        const matchedByKey = Boolean(message.idempotencyKey)
          && idempotencyKeys.includes(String(message.idempotencyKey));

        if (!matchedById && !matchedByKey) {
          return message;
        }

        return {
          ...message,
          status: data.status,
        };
      }));
    };

    const handleMessageSent = (payload: { messageId?: string; idempotencyKey?: string; createdAt?: string }) => {
      if (!payload?.idempotencyKey) return;

      setMessages((prev) => dedupeMessages(prev.map((message) => {
        if (message.idempotencyKey !== payload.idempotencyKey && message._id !== payload.idempotencyKey) {
          return message;
        }

        return {
          ...message,
          _id: payload.messageId ? String(payload.messageId) : message._id,
          createdAt: payload.createdAt || message.createdAt,
        };
      })));
    };

    const handleTypingIndicator = (payload: { userId: string; conversationId: string; isTyping: boolean }) => {
      if (payload.conversationId !== conversationId || payload.userId === userId) return;

      setTypingUsers((prev) => {
        if (payload.isTyping) {
          return prev.includes(payload.userId) ? prev : [...prev, payload.userId];
        }

        return prev.filter((id) => id !== payload.userId);
      });
    };

    const handleRecallMessage = (payload: { messageId?: string; idempotencyKey?: string; conversationId?: string }) => {
      if (payload.conversationId && payload.conversationId !== conversationId) return;

      setMessages((prev) => prev.map((message) => {
        const matchedById = payload.messageId && message._id === payload.messageId;
        const matchedByKey = payload.idempotencyKey && message.idempotencyKey === payload.idempotencyKey;

        if (!matchedById && !matchedByKey) {
          return message;
        }

        return {
          ...message,
          type: 'system-recall',
          content: '[Tin nhan da duoc thu hoi]',
          mediaUrl: undefined,
        };
      }));
    };

    const handleDeleteMessageForMe = (payload: { messageId?: string; conversationId?: string }) => {
      if (payload.conversationId && payload.conversationId !== conversationId) return;
      if (!payload.messageId) return;

      setMessages((prev) => prev.filter((message) => message._id !== payload.messageId));
    };

    socket.on('connect', joinConversationRoom);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('status_update', handleStatusUpdate);
    socket.on('message_sent', handleMessageSent);
    socket.on('typing_indicator', handleTypingIndicator);
    socket.on('message_recalled', handleRecallMessage);
    socket.on('message_deleted_for_me', handleDeleteMessageForMe);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.off('connect', joinConversationRoom);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('status_update', handleStatusUpdate);
      socket.off('message_sent', handleMessageSent);
      socket.off('typing_indicator', handleTypingIndicator);
      socket.off('message_recalled', handleRecallMessage);
      socket.off('message_deleted_for_me', handleDeleteMessageForMe);
    };
  }, [conversationId, userId, scrollToBottom]);

  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    const unreadMessageIds = messages
      .filter((message) => getSenderId(message) !== userId && message.status !== 'read')
      .map((message) => message._id)
      .filter(Boolean);

    if (unreadMessageIds.length > 0) {
      const socket = socketService.getSocket();
      socket?.emit('message_read', { conversationId, messageIds: unreadMessageIds });
    }
  }, [messages, conversationId, userId]);

  const handleSend = useCallback((content?: string, type: Message['type'] = 'text', mediaUrl?: string) => {
    const textToSend = (content ?? inputText).trim();
    if (!conversationId || (!textToSend && !mediaUrl)) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const idempotencyKey = generateUUID();
    const optimisticMessage: Message = {
      _id: idempotencyKey,
      conversationId,
      senderId: userId,
      content: textToSend,
      type,
      mediaUrl,
      status: 'sent',
      createdAt: new Date().toISOString(),
      idempotencyKey,
    };

    setMessages((prev) => dedupeMessages([...prev, optimisticMessage]));
    if (!mediaUrl) setInputText('');

    if (isTypingRef.current) {
      socket.emit('typing_stop', { conversationId });
      isTypingRef.current = false;
    }

    socket.emit('send_message', {
      conversationId,
      content: textToSend,
      type,
      mediaUrl,
      idempotencyKey,
    });

    setTimeout(() => scrollToBottom(), 80);
  }, [inputText, conversationId, userId, scrollToBottom]);

  const handlePickImage = async () => {
    try {
      setIsUploadingMedia(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      const isVideo = asset.type === 'video' || Boolean(asset.mimeType?.startsWith('video/'));
      const uploadType = isVideo ? 'video' : 'image';

      const signRes = await api.post('/upload/generate-signature', { type: uploadType });
      const { signature, timestamp, apiKey, cloudName, folder } = signRes.data;

      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
        name: asset.fileName || (isVideo ? `video-${Date.now()}.mp4` : `image-${Date.now()}.jpg`),
      } as any);
      formData.append('api_key', apiKey);
      formData.append('timestamp', String(timestamp));
      formData.append('signature', signature);
      formData.append('folder', folder);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${uploadType}/upload`, {
        method: 'POST',
        body: formData,
      });
      const cloudData = await cloudRes.json();

      if (cloudData.public_id) {
        const verifyRes = await api.post('/upload/verify', {
          publicId: cloudData.public_id,
          type: uploadType,
        });

        if (verifyRes.data?.secureUrl) {
          handleSend('', isVideo ? 'video' : 'image', verifyRes.data.secureUrl);
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRecall = async (messageId: string, idempotencyKey?: string) => {
    try {
      const socket = socketService.getSocket();
      socket?.emit('recall_message', { conversationId, messageId, idempotencyKey });
      setShowOptionsId(null);
    } catch (err) {
      console.error('Recall failed:', err);
    }
  };

  const handleDeleteForMe = async (messageId: string, idempotencyKey?: string) => {
    try {
      const socket = socketService.getSocket();
      socket?.emit('delete_message_for_me', { conversationId, messageId, idempotencyKey });
      setShowOptionsId(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleTextChange = (text: string) => {
    setInputText(text);

    const socket = socketService.getSocket();
    if (!socket) return;

    if (!isTypingRef.current && text.length > 0) {
      socket.emit('typing_start', { conversationId });
      isTypingRef.current = true;
    }

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

  const handleOpenMedia = useCallback(async (url?: string) => {
    if (!url) return;

    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Cannot open media url', err);
    }
  }, []);

  const renderMessage = useCallback(
    ({ item: message }: { item: Message }) => {
      const isMe = getSenderId(message) === userId;
      const isGroupChat = isGroup === 'true';
      const isSelected = showOptionsId === (message._id || message.idempotencyKey);
      const isRecalled = message.type === 'system-recall';
      const fileName = getFileName(message.type, message.content);

      return (
        <View style={[bubbleStyles.row, isMe ? bubbleStyles.rowRight : bubbleStyles.rowLeft]}>
          {isSelected && (
            <View style={[bubbleStyles.optionsMenu, isMe ? { right: 60 } : { left: 60 }] }>
              <TouchableOpacity style={bubbleStyles.optionItem} onPress={() => handleRecall(message._id, message.idempotencyKey)}>
                <Ionicons name="reload-outline" size={18} color="#fff" />
                <Text style={bubbleStyles.optionText}>Thu hoi</Text>
              </TouchableOpacity>
              <TouchableOpacity style={bubbleStyles.optionItem} onPress={() => handleDeleteForMe(message._id, message.idempotencyKey)}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={[bubbleStyles.optionText, { color: '#ef4444' }]}>Xoa</Text>
              </TouchableOpacity>
            </View>
          )}

          {!isMe && isGroupChat && (
            <View style={bubbleStyles.otherAvatar}>
              <Text style={bubbleStyles.avatarLetter}>
                {getSenderName(message).charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onLongPress={() => {
              if (!isRecalled && message.type !== 'video') {
                setShowOptionsId(message._id || message.idempotencyKey || null);
              }
            }}
            activeOpacity={message.type === 'video' ? 1 : 0.85}
            disabled={message.type === 'video'}
            style={bubbleStyles.messagePressable}
          >
            {!isMe && isGroupChat && (
              <Text style={bubbleStyles.senderName}>{getSenderName(message)}</Text>
            )}

            <View style={[bubbleStyles.bubble, isMe ? bubbleStyles.bubbleMe : bubbleStyles.bubbleOther]}>
              {isRecalled ? (
                <Text style={[bubbleStyles.msgText, bubbleStyles.recallText, isMe && bubbleStyles.recallTextMe]}>
                  {isMe ? 'Ban da thu hoi tin nhan' : 'Tin nhan da duoc thu hoi'}
                </Text>
              ) : message.type === 'text' && message.content ? (
                <Text style={[bubbleStyles.msgText, isMe && bubbleStyles.msgTextMe]}>{message.content}</Text>
              ) : message.type === 'sticker' ? (
                <Text style={bubbleStyles.stickerText}>{message.content || ':)'}</Text>
              ) : message.type === 'image' ? (
                message.mediaUrl ? (
                  <Pressable onPress={() => void handleOpenMedia(message.mediaUrl)}>
                    <Image source={{ uri: message.mediaUrl }} style={bubbleStyles.mediaImage} resizeMode="cover" />
                  </Pressable>
                ) : (
                  <View style={bubbleStyles.mediaPlaceholder}>
                    <Ionicons name="image-outline" size={28} color={isMe ? '#111827' : '#94a3b8'} />
                    <Text style={[bubbleStyles.mediaLabel, isMe && bubbleStyles.mediaLabelMe]}>Anh</Text>
                  </View>
                )
              ) : message.type === 'video' ? (
                <VideoMessage mediaUrl={message.mediaUrl} isMe={isMe} onOpenMedia={handleOpenMedia} />
              ) : isFileType(message.type) ? (
                <Pressable
                  onPress={() => void handleOpenMedia(message.mediaUrl)}
                  style={[bubbleStyles.fileCard, isMe && bubbleStyles.fileCardMe]}
                >
                  <Ionicons name="document-outline" size={22} color={isMe ? '#0f172a' : '#94a3b8'} />
                  <View style={bubbleStyles.fileMeta}>
                    <Text style={[bubbleStyles.fileTitle, isMe && bubbleStyles.fileTitleMe]} numberOfLines={1}>
                      {fileName}
                    </Text>
                    <Text style={[bubbleStyles.fileAction, isMe && bubbleStyles.fileActionMe]}>
                      {message.mediaUrl ? 'Mo tep' : 'Khong co lien ket'}
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <Text style={[bubbleStyles.msgText, isMe && bubbleStyles.msgTextMe]}>{message.content || '[Media]'}</Text>
              )}

              <View style={bubbleStyles.meta}>
                <Text style={[bubbleStyles.time, isMe && bubbleStyles.timeMe]}>
                  {formatTime(message.createdAt)}
                </Text>
                {isMe && <MessageStatusTicks status={message.status} />}
              </View>
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [handleDeleteForMe, handleOpenMedia, handleRecall, isGroup, showOptionsId, userId],
  );

  const androidKeyboardOffset = Platform.OS === 'android'
    ? Math.max(0, keyboardHeight - insets.bottom)
    : 0;

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 12 : 0}
        >
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
                  <Text style={styles.headerStatus}>dang nhap...</Text>
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

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10b981" />
              <Text style={styles.loadingText}>Dang tai tin nhan...</Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item._id || item.idempotencyKey || String(index)}
              renderItem={renderMessage}
              contentContainerStyle={styles.messageList}
              showsVerticalScrollIndicator={false}
              onScroll={handleScrollList}
              scrollEventThrottle={16}
              onLayout={() => scrollToBottom(false)}
              ListHeaderComponent={isMoreLoading ? (
                <View style={styles.loadMoreIndicator}>
                  <ActivityIndicator size="small" color="#10b981" />
                </View>
              ) : null}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="chatbubble-ellipses-outline" size={64} color="#334155" />
                  <Text style={styles.emptyText}>Chua co tin nhan nao</Text>
                  <Text style={styles.emptySubtext}>Hay gui loi chao dau tien!</Text>
                </View>
              }
            />
          )}

          <View style={[styles.composerContainer, { marginBottom: androidKeyboardOffset }]}>
            <TypingIndicator typingUsers={typingUsers} />

            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <TouchableOpacity
                style={styles.inputAction}
                onPress={() => {
                  void handlePickImage();
                }}
                disabled={isUploadingMedia}
              >
                {isUploadingMedia ? (
                  <ActivityIndicator size="small" color="#10b981" />
                ) : (
                  <Ionicons name="add-circle-outline" size={26} color="#64748b" />
                )}
              </TouchableOpacity>

              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhap tin nhan..."
                  placeholderTextColor="#64748b"
                  value={inputText}
                  onChangeText={handleTextChange}
                  multiline
                  maxLength={2000}
                />
                <TouchableOpacity
                  style={styles.emojiBtn}
                  onPress={() => handleSend(':)', 'sticker')}
                  disabled={isUploadingMedia}
                >
                  <Ionicons name="happy-outline" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {inputText.trim() ? (
                <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()} disabled={isUploadingMedia}>
                  <Ionicons name="send" size={20} color="#111827" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.micBtn} disabled>
                  <Ionicons name="mic-outline" size={24} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

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
  messagePressable: {
    maxWidth: '75%',
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
  recallText: {
    fontStyle: 'italic',
    color: '#94a3b8',
  },
  recallTextMe: {
    color: 'rgba(17,24,39,0.6)',
  },
  stickerText: {
    fontSize: 28,
    lineHeight: 34,
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
  mediaLabelMe: {
    color: '#111827',
  },
  mediaImage: {
    width: 220,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#0f172a',
  },
  mediaVideo: {
    width: 220,
    height: 160,
    borderRadius: 12,
    backgroundColor: '#020617',
  },
  videoContainer: {
    width: 220,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(2,6,23,0.24)',
  },
  videoOpenBtn: {
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(15,23,42,0.75)',
  },
  videoOpenBtnMe: {
    backgroundColor: 'rgba(15,23,42,0.18)',
  },
  videoOpenText: {
    color: '#a5f3fc',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  videoOpenTextMe: {
    color: '#0f172a',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 180,
    gap: 8,
  },
  fileCardMe: {
    backgroundColor: 'rgba(0,0,0,0.16)',
    borderColor: 'rgba(15,23,42,0.2)',
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
  },
  fileTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  fileTitleMe: {
    color: '#0f172a',
  },
  fileAction: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  fileActionMe: {
    color: 'rgba(15,23,42,0.75)',
  },
  optionsMenu: {
    position: 'absolute',
    top: -40,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 6,
    flexDirection: 'row',
    gap: 12,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  optionText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_500Medium',
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
  messageList: {
    paddingVertical: 12,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  loadMoreIndicator: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
  composerContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    backgroundColor: colors.surfaceHover,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
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
