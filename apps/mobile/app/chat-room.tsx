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
  Alert,
  Modal,
  ScrollView,
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
import { useMessagePreview } from '../src/hooks/useMessagePreview';
import { MessagePreviewOverlay } from '../src/components/MessagePreviewOverlay';

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
  reactionSummary?: {
    totalCount: number;
    emojiCounts: Record<string, number>;
  };
  reactionUserState?: {
    lastEmoji: string | null;
    totalCount: number;
    emojiCounts: Record<string, number>;
  };
}

interface SendMessageOptions {
  idempotencyKey?: string;
  deferEmit?: boolean;
}

interface PendingMediaDraft {
  asset: ImagePicker.ImagePickerAsset;
  localUri: string;
  messageType: 'image' | 'video';
  uploadType: 'image' | 'video';
}

interface PendingMediaSend {
  idempotencyKey: string;
  content: string;
  messageType: 'image' | 'video';
}

interface ConversationMeta {
  _id: string;
  name?: string;
  avatarUrl?: string;
  type?: 'group' | 'private' | 'direct';
}

interface GroupUpdatedEvent {
  groupId?: string;
  type?: 'created' | 'name_changed' | 'avatar_changed' | 'member_added' | 'member_removed' | 'role_changed' | 'member_approval_changed' | 'disbanded';
  data?: {
    name?: string;
    avatarUrl?: string;
  };
}

interface ReactionDetailsResponse {
  success: boolean;
  messageId: string;
  conversationId: string;
  tabs: Array<{ emoji: string; count: number }>;
  rows: Array<{
    userId: string;
    displayName: string;
    avatarUrl?: string;
    lastEmoji: string | null;
    totalCount: number;
    emojiCounts: Record<string, number>;
  }>;
}

const REACTION_EMOJIS = ['👍', '❤️', '🤣', '😳', '😭', '😡'] as const;

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

  const rawReactionSummary = data.reactionSummary;
  const normalizedReactionSummary =
    rawReactionSummary && typeof rawReactionSummary === 'object'
      ? {
        totalCount:
          typeof (rawReactionSummary as Record<string, unknown>).totalCount === 'number'
            ? Math.max(0, (rawReactionSummary as Record<string, unknown>).totalCount as number)
            : 0,
        emojiCounts:
          typeof (rawReactionSummary as Record<string, unknown>).emojiCounts === 'object'
          && (rawReactionSummary as Record<string, unknown>).emojiCounts !== null
            ? Object.fromEntries(
              Object.entries((rawReactionSummary as Record<string, unknown>).emojiCounts as Record<string, unknown>)
                .filter(([_, value]) => typeof value === 'number' && value > 0),
            ) as Record<string, number>
            : {},
      }
      : undefined;

  const rawReactionUserState = data.reactionUserState;
  const normalizedReactionUserState =
    rawReactionUserState && typeof rawReactionUserState === 'object'
      ? {
        lastEmoji:
          typeof (rawReactionUserState as Record<string, unknown>).lastEmoji === 'string'
            ? ((rawReactionUserState as Record<string, unknown>).lastEmoji as string)
            : null,
        totalCount:
          typeof (rawReactionUserState as Record<string, unknown>).totalCount === 'number'
            ? Math.max(0, (rawReactionUserState as Record<string, unknown>).totalCount as number)
            : 0,
        emojiCounts:
          typeof (rawReactionUserState as Record<string, unknown>).emojiCounts === 'object'
          && (rawReactionUserState as Record<string, unknown>).emojiCounts !== null
            ? Object.fromEntries(
              Object.entries((rawReactionUserState as Record<string, unknown>).emojiCounts as Record<string, unknown>)
                .filter(([_, value]) => typeof value === 'number' && value > 0),
            ) as Record<string, number>
            : {},
      }
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
    reactionSummary: normalizedReactionSummary,
    reactionUserState: normalizedReactionUserState,
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

function resolveMessageRef(message: Message): string {
  return message.idempotencyKey || message._id;
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
  const player = useVideoPlayer(mediaUrl || null, (current: { pause: () => void }) => {
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
  const { conversationId, name, avatarUrl, isGroup } = useLocalSearchParams<{
    conversationId: string;
    name: string;
    avatarUrl?: string;
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
  const [pendingMediaDraft, setPendingMediaDraft] = useState<PendingMediaDraft | null>(null);
  const [pendingMediaSend, setPendingMediaSend] = useState<PendingMediaSend | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [conversationName, setConversationName] = useState(name || 'Chat');
  const [conversationAvatarUrl, setConversationAvatarUrl] = useState<string | undefined>(
    avatarUrl && avatarUrl.length > 0 ? avatarUrl : undefined,
  );
  const [isGroupInfoOpen, setIsGroupInfoOpen] = useState(false);
  const [groupNameDraft, setGroupNameDraft] = useState('');
  const [groupAvatarDraft, setGroupAvatarDraft] = useState<string | undefined>(undefined);
  const [isSavingGroupInfo, setIsSavingGroupInfo] = useState(false);
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);

  const isGroupChat = isGroup === 'true';
  const [reactionPickerVisible, setReactionPickerVisible] = useState(false);
  const [reactionTargetMessageId, setReactionTargetMessageId] = useState<string | null>(null);
  const [reactionUserStateByMessage, setReactionUserStateByMessage] = useState<Record<string, Message['reactionUserState']>>({});
  const [reactionSheetVisible, setReactionSheetVisible] = useState(false);
  const [reactionSheetLoading, setReactionSheetLoading] = useState(false);
  const [reactionSheetData, setReactionSheetData] = useState<ReactionDetailsResponse | null>(null);
  const [reactionSheetTab, setReactionSheetTab] = useState('ALL');

  const {
    previews,
    dismissPreview,
    pauseDismiss,
    resumeDismiss,
    quickReply,
  } = useMessagePreview(conversationId ?? null);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const hydratedReactionStateRefsRef = useRef<Set<string>>(new Set());

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

  useEffect(() => {
    setConversationName(name || 'Chat');
    setConversationAvatarUrl(avatarUrl && avatarUrl.length > 0 ? avatarUrl : undefined);
  }, [name, avatarUrl, conversationId]);

  const loadConversationMeta = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await api.get('/conversations');
      const conversations = Array.isArray(response.data?.data)
        ? (response.data.data as ConversationMeta[])
        : [];
      const currentConversation = conversations.find((item) => item._id === conversationId);

      if (!currentConversation) return;

      if (typeof currentConversation.name === 'string' && currentConversation.name.trim().length > 0) {
        setConversationName(currentConversation.name.trim());
      }

      if (typeof currentConversation.avatarUrl === 'string' && currentConversation.avatarUrl.trim().length > 0) {
        setConversationAvatarUrl(currentConversation.avatarUrl);
      }
    } catch (err: any) {
      console.error('[ERROR] Failed to load conversation meta:', err?.response?.data || err?.message || err);
    }
  }, [conversationId]);

  const uploadAssetToCloudinary = useCallback(async (
    asset: ImagePicker.ImagePickerAsset,
    uploadType: 'image' | 'video',
  ): Promise<string | null> => {
    const signRes = await api.post('/upload/generate-signature', { type: uploadType });
    const { signature, timestamp, apiKey, cloudName, folder } = signRes.data;

    const formData = new FormData();
    formData.append('file', {
      uri: asset.uri,
      type: asset.mimeType || (uploadType === 'video' ? 'video/mp4' : 'image/jpeg'),
      name: asset.fileName || (uploadType === 'video' ? `video-${Date.now()}.mp4` : `image-${Date.now()}.jpg`),
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
    if (!cloudData?.public_id) {
      return null;
    }

    const verifyRes = await api.post('/upload/verify', {
      publicId: cloudData.public_id,
      type: uploadType,
    });

    return typeof verifyRes.data?.secureUrl === 'string' ? verifyRes.data.secureUrl : null;
  }, []);

  const openGroupInfoEditor = useCallback(() => {
    setGroupNameDraft(conversationName);
    setGroupAvatarDraft(conversationAvatarUrl);
    setIsGroupInfoOpen(true);
  }, [conversationName, conversationAvatarUrl]);

  const handlePickGroupAvatar = useCallback(async () => {
    try {
      setIsUploadingGroupAvatar(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;
      const secureUrl = await uploadAssetToCloudinary(result.assets[0], 'image');

      if (secureUrl) {
        setGroupAvatarDraft(secureUrl);
      }
    } catch (err) {
      console.error('Upload group avatar failed:', err);
      Alert.alert('Thong bao', 'Khong the tai len anh nhom. Vui long thu lai.');
    } finally {
      setIsUploadingGroupAvatar(false);
    }
  }, [uploadAssetToCloudinary]);

  const handleHeaderAvatarPress = useCallback(async () => {
    if (!conversationId || !isGroupChat) {
      return;
    }

    try {
      setIsUploadingGroupAvatar(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const secureUrl = await uploadAssetToCloudinary(result.assets[0], 'image');
      if (!secureUrl) {
        return;
      }

      const response = await api.patch(`/groups/${conversationId}`, { avatarUrl: secureUrl });
      const updatedAvatar = typeof response.data?.data?.avatarUrl === 'string'
        ? response.data.data.avatarUrl
        : secureUrl;

      setConversationAvatarUrl(updatedAvatar);
      router.setParams({ avatarUrl: updatedAvatar });
    } catch (err: any) {
      const message = err?.response?.data?.message;
      Alert.alert('Khong the cap nhat anh nhom', typeof message === 'string' ? message : 'Vui long thu lai.');
    } finally {
      setIsUploadingGroupAvatar(false);
    }
  }, [conversationId, isGroupChat, router, uploadAssetToCloudinary]);

  const handleSaveGroupInfo = useCallback(async () => {
    if (!conversationId || !isGroupChat) return;

    const trimmedName = groupNameDraft.trim();
    const normalizedName = trimmedName.length > 0 ? trimmedName : conversationName;
    const normalizedAvatar = groupAvatarDraft;

    const hasNameChange = normalizedName !== conversationName;
    const hasAvatarChange = normalizedAvatar !== conversationAvatarUrl;

    if (!hasNameChange && !hasAvatarChange) {
      setIsGroupInfoOpen(false);
      return;
    }

    try {
      setIsSavingGroupInfo(true);

      const payload: { name?: string; avatarUrl?: string } = {};
      if (hasNameChange) {
        payload.name = normalizedName;
      }
      if (hasAvatarChange && normalizedAvatar) {
        payload.avatarUrl = normalizedAvatar;
      }

      const response = await api.patch(`/groups/${conversationId}`, payload);
      const updatedGroup = response.data?.data as { name?: string; avatarUrl?: string } | undefined;

      const nextName = typeof updatedGroup?.name === 'string' ? updatedGroup.name : normalizedName;
      const nextAvatar = typeof updatedGroup?.avatarUrl === 'string' ? updatedGroup.avatarUrl : normalizedAvatar;

      setConversationName(nextName);
      setConversationAvatarUrl(nextAvatar);
      setIsGroupInfoOpen(false);
      router.setParams({ name: nextName, avatarUrl: nextAvatar || '' });
    } catch (err: any) {
      const message = err?.response?.data?.message;
      Alert.alert('Khong the cap nhat nhom', typeof message === 'string' ? message : 'Vui long thu lai.');
    } finally {
      setIsSavingGroupInfo(false);
    }
  }, [
    conversationAvatarUrl,
    conversationId,
    conversationName,
    groupAvatarDraft,
    groupNameDraft,
    isGroupChat,
    router,
  ]);
  const getReactionUserStateForMessage = useCallback((message: Message) => {
    const byId = reactionUserStateByMessage[message._id];
    if (byId) return byId;
    const messageRef = resolveMessageRef(message);
    const byRef = reactionUserStateByMessage[messageRef];
    if (byRef) return byRef;
    return message.reactionUserState;
  }, [reactionUserStateByMessage]);

  const updateReactionUserStateCache = useCallback((messageId: string, messageRef: string, nextState: NonNullable<Message['reactionUserState']>) => {
    setReactionUserStateByMessage((prev) => ({
      ...prev,
      [messageId]: nextState,
      [messageRef]: nextState,
    }));
  }, []);

  const applyReactionSummaryToMessage = useCallback((target: { messageId?: string; messageRef?: string }, summary: NonNullable<Message['reactionSummary']>, userState?: NonNullable<Message['reactionUserState']>) => {
    setMessages((prev) => prev.map((msg) => {
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
    }));
  }, []);

  const targetMessage = reactionTargetMessageId
    ? messages.find((msg) => msg._id === reactionTargetMessageId || msg.idempotencyKey === reactionTargetMessageId)
    : undefined;

  const openReactionPicker = useCallback((message: Message) => {
    if (message.type === 'system-recall') {
      return;
    }

    const key = message._id || message.idempotencyKey || null;
    if (!key) {
      return;
    }

    setShowOptionsId(null);
    setReactionTargetMessageId(key);
    setReactionPickerVisible(true);
  }, []);

  const closeReactionPicker = useCallback(() => {
    setReactionPickerVisible(false);
    setReactionTargetMessageId(null);
  }, []);

  const sendReactionUpsert = useCallback((message: Message, emoji: string, actionSource: 'picker-select' | 'trigger-click') => {
    if (!conversationId) {
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      return;
    }

    const messageRef = resolveMessageRef(message);
    const requestId = generateUUID();
    const idempotencyKey = generateUUID();

    const prevSummary = message.reactionSummary || { totalCount: 0, emojiCounts: {} };
    const prevUserState = getReactionUserStateForMessage(message) || {
      lastEmoji: null,
      totalCount: 0,
      emojiCounts: {},
    };

    const nextSummaryCounts = { ...(prevSummary.emojiCounts || {}) };
    nextSummaryCounts[emoji] = (nextSummaryCounts[emoji] || 0) + 1;

    const nextSummary: NonNullable<Message['reactionSummary']> = {
      totalCount: prevSummary.totalCount + 1,
      emojiCounts: nextSummaryCounts,
    };

    const nextUserCounts = { ...(prevUserState.emojiCounts || {}) };
    nextUserCounts[emoji] = (nextUserCounts[emoji] || 0) + 1;

    const nextUserState: NonNullable<Message['reactionUserState']> = {
      lastEmoji: emoji,
      totalCount: (prevUserState.totalCount || 0) + 1,
      emojiCounts: nextUserCounts,
    };

    applyReactionSummaryToMessage({ messageId: message._id, messageRef }, nextSummary, nextUserState);
    updateReactionUserStateCache(message._id, messageRef, nextUserState);

    socket.emit('reaction_upsert', {
      requestId,
      conversationId,
      messageRef,
      emoji,
      delta: 1,
      idempotencyKey,
      actionSource,
    });
  }, [applyReactionSummaryToMessage, conversationId, getReactionUserStateForMessage, updateReactionUserStateCache]);

  const sendReactionRemoveAllMine = useCallback((message: Message) => {
    if (!conversationId) {
      return;
    }

    const socket = socketService.getSocket();
    if (!socket) {
      return;
    }

    const messageRef = resolveMessageRef(message);
    const currentUserState = getReactionUserStateForMessage(message);
    if (!currentUserState || currentUserState.totalCount <= 0) {
      return;
    }

    const summary = message.reactionSummary || { totalCount: 0, emojiCounts: {} };
    const nextSummaryCounts = { ...(summary.emojiCounts || {}) };

    Object.entries(currentUserState.emojiCounts || {}).forEach(([emoji, count]) => {
      nextSummaryCounts[emoji] = Math.max(0, (nextSummaryCounts[emoji] || 0) - count);
      if (nextSummaryCounts[emoji] === 0) {
        delete nextSummaryCounts[emoji];
      }
    });

    const nextSummary: NonNullable<Message['reactionSummary']> = {
      totalCount: Math.max(0, summary.totalCount - currentUserState.totalCount),
      emojiCounts: nextSummaryCounts,
    };

    const clearedUserState: NonNullable<Message['reactionUserState']> = {
      lastEmoji: null,
      totalCount: 0,
      emojiCounts: {},
    };

    applyReactionSummaryToMessage({ messageId: message._id, messageRef }, nextSummary, clearedUserState);
    updateReactionUserStateCache(message._id, messageRef, clearedUserState);

    socket.emit('reaction_remove_all_mine', {
      requestId: generateUUID(),
      conversationId,
      messageRef,
      idempotencyKey: generateUUID(),
    });
  }, [applyReactionSummaryToMessage, conversationId, getReactionUserStateForMessage, updateReactionUserStateCache]);

  const handlePickReaction = useCallback((emoji: string) => {
    if (!targetMessage) {
      return;
    }

    sendReactionUpsert(targetMessage, emoji, 'picker-select');
    closeReactionPicker();
  }, [closeReactionPicker, sendReactionUpsert, targetMessage]);

  const handleQuickAddFromTrigger = useCallback((message: Message) => {
    const myState = getReactionUserStateForMessage(message);
    const lastEmoji = myState?.lastEmoji;
    if (!lastEmoji) {
      return;
    }

    sendReactionUpsert(message, lastEmoji, 'trigger-click');
  }, [getReactionUserStateForMessage, sendReactionUpsert]);

  const openReactionDetailsSheet = useCallback(async (message: Message) => {
    setReactionSheetVisible(true);
    setReactionSheetLoading(true);
    setReactionSheetData(null);
    setReactionSheetTab('ALL');

    try {
      const messageRef = resolveMessageRef(message);
      const res = await api.get<ReactionDetailsResponse>(`/messages/${messageRef}/reactions/details`);
      setReactionSheetData(res.data);
    } catch (err) {
      console.error('Failed to load reaction details:', err);
      setReactionSheetData(null);
    } finally {
      setReactionSheetLoading(false);
    }
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
      void loadConversationMeta();

      return () => {
        setShowOptionsId(null);
      };
    }, [loadConversationMeta, loadMessages]),
  );

  useEffect(() => {
    hydratedReactionStateRefsRef.current.clear();
    setReactionUserStateByMessage({});
    setReactionPickerVisible(false);
    setReactionTargetMessageId(null);
    setReactionSheetVisible(false);
    setReactionSheetData(null);
    setReactionSheetTab('ALL');
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !userId || messages.length === 0) {
      return;
    }

    const candidates = messages.filter((message) => {
      const totalCount = message.reactionSummary?.totalCount || 0;
      if (totalCount <= 0) {
        return false;
      }

      const messageRef = resolveMessageRef(message);
      if (hydratedReactionStateRefsRef.current.has(messageRef)) {
        return false;
      }

      return !reactionUserStateByMessage[message._id] && !reactionUserStateByMessage[messageRef];
    });

    if (candidates.length === 0) {
      return;
    }

    candidates.forEach((message) => hydratedReactionStateRefsRef.current.add(resolveMessageRef(message)));

    let cancelled = false;

    void (async () => {
      const updates: Array<{
        messageId: string;
        messageRef: string;
        userState: NonNullable<Message['reactionUserState']>;
      }> = [];

      await Promise.allSettled(
        candidates.map(async (message) => {
          try {
            const messageRef = resolveMessageRef(message);
            const res = await api.get<ReactionDetailsResponse>(`/messages/${messageRef}/reactions/details`);
            const details = res.data;
            const me = details.rows.find((row) => row.userId === userId && row.totalCount > 0);
            if (!me) {
              return;
            }

            updates.push({
              messageId: details.messageId || message._id,
              messageRef,
              userState: {
                lastEmoji: me.lastEmoji,
                totalCount: me.totalCount,
                emojiCounts: me.emojiCounts,
              },
            });
          } catch {
            // Ignore hydrate failures; realtime updates still reconcile state.
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

      setMessages((prev) => prev.map((message) => {
        const msgId = String(message._id);
        const msgRef = String(message.idempotencyKey || '');
        const found = updates.find((item) => (
          msgId === String(item.messageId)
          || msgId === String(item.messageRef)
          || msgRef === String(item.messageId)
          || msgRef === String(item.messageRef)
        ));

        if (!found) {
          return message;
        }

        return {
          ...message,
          reactionUserState: found.userState,
        };
      }));
    })();

    return () => {
      cancelled = true;
    };
  }, [conversationId, messages, reactionUserStateByMessage, userId]);

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

    const handleGroupUpdated = (payload: GroupUpdatedEvent) => {
      if (!payload?.groupId || payload.groupId !== conversationId) {
        return;
      }

      if (payload.type === 'name_changed' && typeof payload.data?.name === 'string') {
        setConversationName(payload.data.name);
        router.setParams({ name: payload.data.name });
      }

      if (payload.type === 'avatar_changed') {
        const nextAvatar = typeof payload.data?.avatarUrl === 'string' ? payload.data.avatarUrl : '';
        setConversationAvatarUrl(nextAvatar || undefined);
        router.setParams({ avatarUrl: nextAvatar });
      }
    };

    const handleReactionUpdated = (payload: {
      messageId: string;
      messageRef: string;
      conversationId: string;
      actor: { userId: string; action: 'upsert' | 'remove_all_mine' };
      summary: { totalCount: number; emojiCounts: Record<string, number> };
      userState?: {
        userId: string;
        lastEmoji: string | null;
        totalCount: number;
        emojiCounts: Record<string, number>;
      };
    }) => {
      if (payload.conversationId !== conversationId) {
        return;
      }

      applyReactionSummaryToMessage(
        { messageId: payload.messageId, messageRef: payload.messageRef },
        payload.summary,
        payload.actor.userId === userId ? payload.userState : undefined,
      );

      if (payload.actor.userId === userId && payload.userState) {
        updateReactionUserStateCache(payload.messageId, payload.messageRef, payload.userState);
      }
    };

    const handleReactionError = (payload: { message?: string }) => {
      if (payload?.message) {
        console.error('[Reaction] mobile socket error:', payload.message);
      }
    };

    socket.on('connect', joinConversationRoom);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('status_update', handleStatusUpdate);
    socket.on('message_sent', handleMessageSent);
    socket.on('typing_indicator', handleTypingIndicator);
    socket.on('message_recalled', handleRecallMessage);
    socket.on('message_deleted_for_me', handleDeleteMessageForMe);
    socket.on('group_updated', handleGroupUpdated);
    socket.on('reaction_updated', handleReactionUpdated);
    socket.on('reaction_error', handleReactionError);

    return () => {
      socket.emit('leave_conversation', { conversationId });
      socket.off('connect', joinConversationRoom);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('status_update', handleStatusUpdate);
      socket.off('message_sent', handleMessageSent);
      socket.off('typing_indicator', handleTypingIndicator);
      socket.off('message_recalled', handleRecallMessage);
      socket.off('message_deleted_for_me', handleDeleteMessageForMe);
      socket.off('reaction_updated', handleReactionUpdated);
      socket.off('reaction_error', handleReactionError);
    };
  }, [
    applyReactionSummaryToMessage,
    conversationId,
    scrollToBottom,
    updateReactionUserStateCache,
    userId,
  ]);

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

  const handleSend = useCallback((
    content?: string,
    type: Message['type'] = 'text',
    mediaUrl?: string,
    options?: SendMessageOptions,
  ) => {
    const textToSend = (content ?? inputText).trim();
    if (!conversationId || (!textToSend && !mediaUrl)) return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const idempotencyKey = options?.idempotencyKey || generateUUID();
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

    setMessages((prev) => {
      const index = prev.findIndex(
        (message) => message.idempotencyKey === idempotencyKey || message._id === idempotencyKey,
      );

      if (index === -1) {
        return dedupeMessages([...prev, optimisticMessage]);
      }

      const next = [...prev];
      next[index] = {
        ...next[index],
        ...optimisticMessage,
        _id: next[index]._id,
        createdAt: next[index].createdAt || optimisticMessage.createdAt,
      };
      return dedupeMessages(next);
    });

    if (!mediaUrl) setInputText('');

    if (isTypingRef.current) {
      socket.emit('typing_stop', { conversationId });
      isTypingRef.current = false;
    }

    if (!options?.deferEmit) {
      socket.emit('send_message', {
        conversationId,
        content: textToSend,
        type,
        mediaUrl,
        idempotencyKey,
      });
    }

    setTimeout(() => scrollToBottom(), 80);
    return idempotencyKey;
  }, [inputText, conversationId, userId, scrollToBottom]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) return;
      const asset = result.assets[0];

      const isVideo = asset.type === 'video' || Boolean(asset.mimeType?.startsWith('video/'));
      const messageType: PendingMediaDraft['messageType'] = isVideo ? 'video' : 'image';
      const uploadType: PendingMediaDraft['uploadType'] = isVideo ? 'video' : 'image';

      setPendingMediaDraft({
        asset,
        localUri: asset.uri,
        messageType,
        uploadType,
      });
    } catch (err) {
      console.error('Pick media failed:', err);
    }
  };

  const handleComposerSend = useCallback(() => {
    if (pendingMediaDraft) {
      if (pendingMediaSend || isUploadingMedia) {
        return;
      }

      const messageContent = inputText.trim();
      const pendingMessageId = handleSend(
        messageContent,
        pendingMediaDraft.messageType,
        pendingMediaDraft.localUri,
        { deferEmit: true },
      );

      if (!pendingMessageId) {
        return;
      }

      setInputText('');
      setPendingMediaSend({
        idempotencyKey: pendingMessageId,
        content: messageContent,
        messageType: pendingMediaDraft.messageType,
      });

      void (async () => {
        try {
          setIsUploadingMedia(true);
          const secureUrl = await uploadAssetToCloudinary(
            pendingMediaDraft.asset,
            pendingMediaDraft.uploadType,
          );

          if (!secureUrl) {
            throw new Error('Upload verify failed');
          }

          handleSend(
            messageContent,
            pendingMediaDraft.messageType,
            secureUrl,
            { idempotencyKey: pendingMessageId },
          );

          setPendingMediaSend(null);
          setPendingMediaDraft(null);
        } catch (err) {
          console.error('Upload failed after send:', err);
          setMessages((prev) =>
            prev.filter(
              (message) => message.idempotencyKey !== pendingMessageId && message._id !== pendingMessageId,
            ),
          );
          setPendingMediaSend(null);
          Alert.alert('Thong bao', 'Tai media that bai. Vui long thu lai.');
        } finally {
          setIsUploadingMedia(false);
        }
      })();

      return;
    }

    if (!inputText.trim()) {
      return;
    }

    handleSend();
  }, [handleSend, inputText, isUploadingMedia, pendingMediaDraft, pendingMediaSend, uploadAssetToCloudinary]);

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
      const isSelected = showOptionsId === (message._id || message.idempotencyKey);
      const isGroupChat = isGroup === 'true';
      const isRecalled = message.type === 'system-recall';
      const fileName = getFileName(message.type, message.content);
      const summary = message.reactionSummary;
      const summaryTotalCount = summary?.totalCount || 0;
      const summaryEntries = Object.entries(summary?.emojiCounts || {})
        .filter(([_, count]) => count > 0)
        .sort((a, b) => b[1] - a[1]);
      const myReactionState = getReactionUserStateForMessage(message);
      const myLastEmoji = myReactionState?.lastEmoji || null;
      const showSummaryPill = summaryTotalCount > 0;
      const showReactionTrigger = Boolean(myLastEmoji);

      return (
        <View style={[bubbleStyles.row, isMe ? bubbleStyles.rowRight : bubbleStyles.rowLeft]}>
          {!isMe && isGroupChat && (
            <View style={bubbleStyles.otherAvatar}>
              <Text style={bubbleStyles.avatarLetter}>
                {getSenderName(message).charAt(0).toUpperCase() || '?'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onLongPress={() => {
              if (!isRecalled) {
                openReactionPicker(message);
              }
            }}
            delayLongPress={220}
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

              {message.type !== 'text'
                && message.type !== 'sticker'
                && message.type !== 'system-recall'
                && message.content
                && message.content.trim().length > 0 && (
                <Text style={[bubbleStyles.msgText, bubbleStyles.mediaCaptionText, isMe && bubbleStyles.msgTextMe]}>
                  {message.content}
                </Text>
              )}

              <View style={bubbleStyles.meta}>
                <Text style={[bubbleStyles.time, isMe && bubbleStyles.timeMe]}>
                  {formatTime(message.createdAt)}
                </Text>
                {isMe && <MessageStatusTicks status={message.status} />}
              </View>
            </View>

            {!isRecalled && (showSummaryPill || showReactionTrigger) && (
              <View style={[bubbleStyles.reactionRow, isMe ? bubbleStyles.reactionRowMe : bubbleStyles.reactionRowOther]}>
                {showSummaryPill && (
                  <Pressable
                    onPress={() => {
                      void openReactionDetailsSheet(message);
                    }}
                    style={bubbleStyles.summaryPill}
                  >
                    {summaryEntries.slice(0, 3).map(([emoji]) => (
                      <Text key={`${message._id}-${emoji}`} style={bubbleStyles.summaryEmoji}>{emoji}</Text>
                    ))}
                    <Text style={bubbleStyles.summaryCount}>{summaryTotalCount}</Text>
                  </Pressable>
                )}

                {showReactionTrigger && (
                  <Pressable
                    onPress={() => handleQuickAddFromTrigger(message)}
                    onLongPress={() => openReactionPicker(message)}
                    delayLongPress={220}
                    style={bubbleStyles.reactionTrigger}
                  >
                    <Text style={bubbleStyles.reactionTriggerText}>{myLastEmoji}</Text>
                  </Pressable>
                )}
              </View>
            )}
          </TouchableOpacity>
        </View>
      );
    },
    [
      getReactionUserStateForMessage,
      handleDeleteForMe,
      handleOpenMedia,
      handleQuickAddFromTrigger,
      handleRecall,
      isGroup,
      openReactionDetailsSheet,
      openReactionPicker,
      showOptionsId,
      userId,
    ],
  );

  const androidKeyboardOffset = Platform.OS === 'android'
    ? Math.max(0, keyboardHeight - insets.bottom)
    : 0;
  const previewTopOffset = insets.top - 50;

  const targetMessageReactionState = targetMessage ? getReactionUserStateForMessage(targetMessage) : undefined;
  const canClearTargetReaction = Boolean(targetMessageReactionState && targetMessageReactionState.totalCount > 0);

  const reactionSheetTabs = (reactionSheetData?.tabs || []).filter((tab) => tab.count > 0 || tab.emoji === 'ALL');
  const reactionSheetRows = (reactionSheetData?.rows || []).filter((row) => row.totalCount > 0);
  const selectedReactionSheetRows = reactionSheetTab === 'ALL'
    ? reactionSheetRows
    : reactionSheetRows.filter((row) => (row.emojiCounts?.[reactionSheetTab] || 0) > 0);

  const closeReactionSheet = useCallback(() => {
    setReactionSheetVisible(false);
    setReactionSheetData(null);
    setReactionSheetTab('ALL');
  }, []);

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
              <TouchableOpacity
                style={styles.headerAvatar}
                onPress={() => {
                  void handleHeaderAvatarPress();
                }}
                disabled={!isGroupChat || isSavingGroupInfo || isUploadingGroupAvatar}
              >
                {conversationAvatarUrl ? (
                  <Image source={{ uri: conversationAvatarUrl }} style={styles.headerAvatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.headerAvatarText}>
                    {(conversationName || 'C').charAt(0).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>
              <View>
                <TouchableOpacity
                  onPress={isGroupChat ? openGroupInfoEditor : undefined}
                  disabled={!isGroupChat || isSavingGroupInfo}
                >
                  <Text style={styles.headerName} numberOfLines={1}>
                    {conversationName || 'Chat'}
                  </Text>
                </TouchableOpacity>
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
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={isGroupChat ? openGroupInfoEditor : undefined}
                disabled={!isGroupChat}
              >
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

          <Modal
            visible={isGroupInfoOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setIsGroupInfoOpen(false)}
          >
            <View style={styles.groupModalOverlay}>
              <View style={styles.groupModalCard}>
                <Text style={styles.groupModalTitle}>Cap nhat nhom</Text>

                <TouchableOpacity
                  style={styles.groupAvatarPicker}
                  onPress={() => {
                    void handlePickGroupAvatar();
                  }}
                  disabled={isUploadingGroupAvatar || isSavingGroupInfo}
                >
                  {groupAvatarDraft ? (
                    <Image source={{ uri: groupAvatarDraft }} style={styles.groupAvatarPreview} resizeMode="cover" />
                  ) : (
                    <Text style={styles.groupAvatarPlaceholder}>
                      {(groupNameDraft || conversationName || 'N').charAt(0).toUpperCase()}
                    </Text>
                  )}
                  <View style={styles.groupAvatarCameraBadge}>
                    {isUploadingGroupAvatar ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <Ionicons name="camera-outline" size={14} color="#0f172a" />
                    )}
                  </View>
                </TouchableOpacity>

                <TextInput
                  style={styles.groupNameInput}
                  value={groupNameDraft}
                  onChangeText={setGroupNameDraft}
                  placeholder="Nhap ten nhom"
                  placeholderTextColor="#6b7280"
                  maxLength={100}
                  editable={!isSavingGroupInfo}
                />

                <View style={styles.groupModalActions}>
                  <TouchableOpacity
                    style={[styles.groupModalButton, styles.groupModalCancelButton]}
                    onPress={() => setIsGroupInfoOpen(false)}
                    disabled={isSavingGroupInfo}
                  >
                    <Text style={styles.groupModalCancelText}>Huy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.groupModalButton, styles.groupModalSaveButton, isSavingGroupInfo && { opacity: 0.7 }]}
                    onPress={() => {
                      void handleSaveGroupInfo();
                    }}
                    disabled={isSavingGroupInfo || isUploadingGroupAvatar}
                  >
                    {isSavingGroupInfo ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <Text style={styles.groupModalSaveText}>Luu</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          <MessagePreviewOverlay
            previews={previews}
            onDismiss={dismissPreview}
            onPauseDismiss={pauseDismiss}
            onResumeDismiss={resumeDismiss}
            onQuickReply={quickReply}
            topOffset={previewTopOffset}
            onNavigate={(targetConversationId) => {
              router.replace({
                pathname: '/chat-room',
                params: {
                  conversationId: targetConversationId,
                  name: 'Chat',
                  isGroup: 'false',
                },
              });
            }}
          />

          <View style={[styles.composerContainer, { marginBottom: androidKeyboardOffset }]}>
            <TypingIndicator typingUsers={typingUsers} />

            {pendingMediaDraft && (
              <View style={styles.mediaDraftBar}>
                {pendingMediaDraft.messageType === 'image' ? (
                  <Image source={{ uri: pendingMediaDraft.localUri }} style={styles.mediaDraftPreview} resizeMode="cover" />
                ) : (
                  <View style={styles.mediaDraftVideoCard}>
                    <Ionicons name="videocam-outline" size={18} color="#cbd5e1" />
                    <Text style={styles.mediaDraftVideoText}>Video da chon</Text>
                  </View>
                )}

                <View style={styles.mediaDraftMeta}>
                  <Text style={styles.mediaDraftTitle} numberOfLines={1}>
                    {pendingMediaDraft.messageType === 'image' ? 'Anh dinh kem' : 'Video dinh kem'}
                  </Text>
                  <Text style={styles.mediaDraftStatus}>
                    {pendingMediaSend
                      ? isUploadingMedia
                        ? 'Dang tai sau khi gui'
                        : 'Dang gui tin nhan'
                      : 'San sang gui'}
                  </Text>
                </View>

                {!pendingMediaSend && !isUploadingMedia && (
                  <TouchableOpacity
                    style={styles.mediaDraftRemoveBtn}
                    onPress={() => {
                      setPendingMediaDraft(null);
                    }}
                  >
                    <Ionicons name="close" size={16} color="#e2e8f0" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
              <TouchableOpacity
                style={styles.inputAction}
                onPress={() => {
                  void handlePickImage();
                }}
                disabled={isUploadingMedia || Boolean(pendingMediaSend)}
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
                  disabled={Boolean(pendingMediaSend) || isUploadingMedia}
                >
                  <Ionicons name="happy-outline" size={22} color="#64748b" />
                </TouchableOpacity>
              </View>

              {inputText.trim() || pendingMediaDraft ? (
                <TouchableOpacity
                  style={[styles.sendBtn, pendingMediaSend ? styles.sendBtnDisabled : null]}
                  onPress={handleComposerSend}
                  disabled={Boolean(pendingMediaSend)}
                >
                  <Ionicons name="send" size={20} color="#111827" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.micBtn} disabled>
                  <Ionicons name="mic-outline" size={24} color="#64748b" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <Modal
            visible={reactionPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={closeReactionPicker}
          >
            <Pressable style={styles.reactionOverlay} onPress={closeReactionPicker}>
              <Pressable style={styles.reactionPickerCard} onPress={(event) => event.stopPropagation()}>
                <View style={styles.reactionEmojiRow}>
                  {REACTION_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      style={styles.reactionEmojiButton}
                      onPress={() => handlePickReaction(emoji)}
                    >
                      <Text style={styles.reactionEmojiText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>

                {canClearTargetReaction && targetMessage && (
                  <Pressable
                    style={styles.reactionClearButton}
                    onPress={() => {
                      sendReactionRemoveAllMine(targetMessage);
                      closeReactionPicker();
                    }}
                  >
                    <Text style={styles.reactionClearText}>Xóa cảm xúc của tôi</Text>
                  </Pressable>
                )}

                {targetMessage && (
                  <View style={styles.reactionActionRow}>
                    <Pressable
                      style={styles.reactionActionButton}
                      onPress={() => {
                        void handleRecall(targetMessage._id, targetMessage.idempotencyKey);
                        closeReactionPicker();
                      }}
                    >
                      <Ionicons name="reload-outline" size={16} color="#e2e8f0" />
                      <Text style={styles.reactionActionText}>Thu hồi</Text>
                    </Pressable>

                    <Pressable
                      style={[styles.reactionActionButton, styles.reactionActionButtonDanger]}
                      onPress={() => {
                        void handleDeleteForMe(targetMessage._id, targetMessage.idempotencyKey);
                        closeReactionPicker();
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fecaca" />
                      <Text style={[styles.reactionActionText, styles.reactionActionTextDanger]}>Xóa</Text>
                    </Pressable>
                  </View>
                )}
              </Pressable>
            </Pressable>
          </Modal>

          <Modal
            visible={reactionSheetVisible}
            transparent
            animationType="slide"
            onRequestClose={closeReactionSheet}
          >
            <View style={styles.sheetOverlay}>
              <Pressable style={styles.sheetBackdrop} onPress={closeReactionSheet} />

              <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <View style={styles.sheetContent}>
                  <View style={styles.sheetHeader}>
                    <Text style={styles.sheetTitle}>Chi tiết cảm xúc</Text>
                    <TouchableOpacity
                      style={styles.sheetCloseBtn}
                      onPress={closeReactionSheet}
                    >
                      <Text style={styles.sheetCloseText}>Đóng</Text>
                    </TouchableOpacity>
                  </View>

                  {reactionSheetLoading ? (
                    <View style={styles.sheetLoadingBox}>
                      <ActivityIndicator size="small" color="#10b981" />
                      <Text style={styles.sheetLoadingText}>Đang tải...</Text>
                    </View>
                  ) : (
                    <>
                      <ScrollView
                        style={styles.sheetTabsScroll}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.sheetTabsRow}
                      >
                        {reactionSheetTabs.map((tab) => {
                          const selected = reactionSheetTab === tab.emoji;
                          return (
                            <Pressable
                              key={tab.emoji}
                              onPress={() => setReactionSheetTab(tab.emoji)}
                              style={[styles.sheetTabPill, selected && styles.sheetTabPillActive]}
                            >
                              <Text style={[styles.sheetTabText, selected && styles.sheetTabTextActive]}>
                                {tab.emoji === 'ALL' ? `Tất cả ${tab.count}` : `${tab.emoji} ${tab.count}`}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>

                      <ScrollView style={styles.sheetRowsScroll} contentContainerStyle={styles.sheetRowsContent}>
                        {selectedReactionSheetRows.length === 0 ? (
                          <Text style={styles.sheetEmptyText}>Chưa có cảm xúc.</Text>
                        ) : (
                          selectedReactionSheetRows.map((row) => (
                            <View key={row.userId} style={styles.sheetRowItem}>
                              <View style={styles.sheetAvatarCircle}>
                                <Text style={styles.sheetAvatarText}>
                                  {(row.displayName || '?').slice(0, 1).toUpperCase()}
                                </Text>
                              </View>

                              <View style={styles.sheetRowBody}>
                                <Text style={styles.sheetRowName}>{row.displayName}</Text>
                                <View style={styles.sheetRowEmojiWrap}>
                                  {Object.entries(row.emojiCounts || {})
                                    .filter(([_, count]) => count > 0)
                                    .map(([emoji, count]) => (
                                      <View key={`${row.userId}-${emoji}`} style={styles.sheetRowEmojiPill}>
                                        <Text style={styles.sheetRowEmojiPillText}>{emoji} {count}</Text>
                                      </View>
                                    ))}
                                </View>
                              </View>

                              <Text style={styles.sheetRowCount}>{row.totalCount} lần</Text>
                            </View>
                          ))
                        )}
                      </ScrollView>
                    </>
                  )}
                </View>
              </View>
            </View>
          </Modal>
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
  mediaCaptionText: {
    marginTop: 8,
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
  reactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  reactionRowMe: {
    justifyContent: 'flex-end',
  },
  reactionRowOther: {
    justifyContent: 'flex-start',
  },
  summaryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(2, 45, 35, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.35)',
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 2,
  },
  summaryEmoji: {
    fontSize: 12,
    marginRight: 1,
  },
  summaryCount: {
    color: '#d1fae5',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginLeft: 3,
  },
  reactionTrigger: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    backgroundColor: 'rgba(2, 45, 35, 0.95)',
    paddingHorizontal: 8,
  },
  reactionTriggerText: {
    fontSize: 15,
    lineHeight: 18,
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
  headerAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
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
  mediaDraftBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginHorizontal: 12,
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.25)',
    gap: 10,
  },
  mediaDraftPreview: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  mediaDraftVideoCard: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaDraftVideoText: {
    marginTop: 2,
    color: '#cbd5e1',
    fontSize: 8,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  mediaDraftMeta: {
    flex: 1,
    minWidth: 0,
  },
  mediaDraftTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  mediaDraftStatus: {
    marginTop: 2,
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  mediaDraftRemoveBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30,41,59,0.8)',
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
  sendBtnDisabled: {
    opacity: 0.65,
  },
  micBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 0,
  },
  groupModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  groupModalCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#0b1726',
    borderWidth: 1,
    borderColor: '#1f3347',
    padding: 18,
    alignItems: 'center',
  },
  groupModalTitle: {
    color: '#e2e8f0',
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    marginBottom: 16,
  },
  groupAvatarPicker: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#24364b',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  groupAvatarPreview: {
    width: '100%',
    height: '100%',
  },
  groupAvatarPlaceholder: {
    color: '#e2e8f0',
    fontSize: 34,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  groupAvatarCameraBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#34d399',
    justifyContent: 'center',
    alignItems: 'center',
  },
  groupNameInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#e2e8f0',
    fontSize: 15,
    fontFamily: 'BeVietnamPro_500Medium',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    backgroundColor: '#111c2b',
  },
  groupModalActions: {
    width: '100%',
    flexDirection: 'row',
    gap: 10,
  },
  groupModalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupModalCancelButton: {
    backgroundColor: '#1f2937',
  },
  groupModalSaveButton: {
    backgroundColor: '#34d399',
  },
  groupModalCancelText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  groupModalSaveText: {
    color: '#0f172a',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  reactionOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.35)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 120,
  },
  reactionPickerCard: {
    backgroundColor: 'rgba(7, 37, 30, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.22)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  reactionEmojiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  reactionEmojiButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 118, 110, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(45,212,191,0.28)',
  },
  reactionEmojiText: {
    fontSize: 24,
    lineHeight: 28,
  },
  reactionClearButton: {
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(127, 29, 29, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  reactionClearText: {
    color: '#fecaca',
    fontFamily: 'BeVietnamPro_500Medium',
    fontSize: 12,
  },
  reactionActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reactionActionButton: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.4)',
    backgroundColor: 'rgba(2, 6, 23, 0.35)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reactionActionButtonDanger: {
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(127, 29, 29, 0.28)',
  },
  reactionActionText: {
    color: '#e2e8f0',
    fontFamily: 'BeVietnamPro_500Medium',
    fontSize: 12,
  },
  reactionActionTextDanger: {
    color: '#fecaca',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 6, 23, 0.45)',
  },
  sheetContainer: {
    minHeight: '45%',
    maxHeight: '75%',
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  sheetContent: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: {
    color: '#0f172a',
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 17,
  },
  sheetCloseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
  },
  sheetCloseText: {
    color: '#0f172a',
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
  },
  sheetLoadingBox: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  sheetLoadingText: {
    color: '#334155',
    fontFamily: 'BeVietnamPro_500Medium',
    fontSize: 13,
  },
  sheetTabsScroll: {
    maxHeight: 58,
    flexGrow: 0,
    marginBottom: 4,
  },
  sheetTabsRow: {
    alignItems: 'center',
    paddingBottom: 6,
    paddingRight: 8,
    gap: 6,
  },
  sheetTabPill: {
    alignSelf: 'flex-start',
    borderRadius: 13,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 10,
    minHeight: 32,
    justifyContent: 'center',
  },
  sheetTabPillActive: {
    backgroundColor: '#0f766e',
  },
  sheetTabText: {
    color: '#0f172a',
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 12,
  },
  sheetTabTextActive: {
    color: '#ecfeff',
  },
  sheetRowsScroll: {
    flex: 1,
  },
  sheetRowsContent: {
    gap: 10,
    paddingBottom: 12,
  },
  sheetEmptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 24,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  sheetRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  sheetAvatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d1fae5',
  },
  sheetAvatarText: {
    color: '#065f46',
    fontFamily: 'BeVietnamPro_700Bold',
    fontSize: 16,
  },
  sheetRowBody: {
    flex: 1,
    minWidth: 0,
  },
  sheetRowName: {
    color: '#0f172a',
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 16,
  },
  sheetRowEmojiWrap: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sheetRowEmojiPill: {
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sheetRowEmojiPillText: {
    color: '#334155',
    fontFamily: 'BeVietnamPro_500Medium',
    fontSize: 12,
  },
  sheetRowCount: {
    color: '#334155',
    fontFamily: 'BeVietnamPro_600SemiBold',
    fontSize: 14,
  },
});
