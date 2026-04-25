'use client';

import { type ChangeEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Message, MessageStatus } from '@zync/shared-types';
import { MessageBubble } from '../atoms/message-bubble';
import { MessageItem } from '../molecules/message-item';
import { TypingIndicator } from '../atoms/typing-indicator';
import { MessageInput } from '../molecules/message-input';
import { MessageType } from '@zync/shared-types';
import { generateUploadSignature, verifyUpload } from '@/services/chat';
import type { ReactionDetailsResponse } from '@/services/chat';
import { reportMessage, reactMessage } from '@/services/chat';

interface SendMessageOptions {
  idempotencyKey?: string;
  deferEmit?: boolean;
  replyTo?: Message['replyTo'];
}

type CallUiStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'ended' | 'missed' | 'rejected';

// ==================== ICONS ====================

function PhoneIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 3a2.5 2.5 0 0 1 2.5-2.5h2.69a2.5 2.5 0 0 1 2.5 2.5v3.69a2.5 2.5 0 0 1-2.5 2.5H5a13 13 0 0 0 13 13v-3.81a2.5 2.5 0 0 1 2.5-2.5h3.69a2.5 2.5 0 0 1 2.5 2.5V21a2.5 2.5 0 0 1-2.5 2.5h-6.5A18 18 0 0 1 3.5 3Z" /></svg>;
}

function VideoIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x={1} y={5} width={15} height={14} rx={2} ry={2} /></svg>;
}

function MicIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x={9} y={2} width={6} height={11} rx={3} /><path d="M5 10a7 7 0 0 0 14 0" /><path d="M12 17v5" /><path d="M8 22h8" /></svg>;
}

function CameraControlIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect x={2} y={6} width={14} height={12} rx={2} ry={2} /></svg>;
}

function ScreenShareIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><rect x={2} y={3} width={20} height={14} rx={2} /><path d="M8 21h8" /><path d="M12 17v4" /><path d="m9 10 3-3 3 3" /><path d="M12 7v7" /></svg>;
}

function EndCallIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 15.5c4.8-4.5 10.2-4.5 15 0" /><path d="M8.5 12.5c.4 1.6.8 2.6 1.4 3.1" /><path d="M15.5 12.5c-.4 1.6-.8 2.6-1.4 3.1" /></svg>;
}

function CheckIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="m5 13 4 4L19 7" /></svg>;
}

function CloseIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}

function InfoIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10} /><line x1={12} y1={16} x2={12} y2={12} /><line x1={12} y1={8} x2={12.01} y2={8} /></svg>;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

function BellOffMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.58 6.53A5 5 0 0 1 17 11v3l2 2H7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 18a3 3 0 0 0 6 0" strokeLinecap="round" />
      <path d="M4 16h1l2-2v-3a5 5 0 0 1 .58-2.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinMiniIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 3l6 6-2 2-3-3-3 3v4l-2 2v-6l-5 5-2-2 5-5H3l2-2h4l3-3-3-3 2-2 6 6z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ==================== TYPES ====================

interface ChatPanelProps {
  conversationId?: string;
  currentUserId?: string;
  participantName?: string;
  participantAvatar?: string;
  participantAvatarUrl?: string;
  isGroupConversation?: boolean;
  isOnline?: boolean;
  messages?: Message[];
  messageStatus?: Record<string, string>;
  typingUsers?: Array<{ userId: string; displayName: string }>;
  onSendMessage?: (content: string, type: MessageType, mediaUrl?: string, options?: SendMessageOptions) => Promise<string | null | undefined>;
  onCancelPendingMessage?: (idempotencyKey: string) => void;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  onLoadMore?: () => Promise<void>;
  onInfoClick?: () => void;
  onDeleteMessageForMe?: (messageId: string, idempotencyKey: string) => void;
  onRecallMessage?: (messageId: string, idempotencyKey: string) => void;
  onForwardMessage?: (message: Message) => void;
  onAvatarClick?: () => void;
  onNameClick?: () => void;
  inputDisabled?: boolean;
  inputDisabledReason?: string;
  onReactionUpsert?: (message: Message, emoji: string, delta: 1 | 2 | 3, actionSource: string) => void;
  onReactionRemoveAllMine?: (message: Message) => void;
  onFetchReactionDetails?: (message: Message) => Promise<ReactionDetailsResponse>;
  reactionUserStateByMessage?: Record<string, {
    lastEmoji: string | null;
    totalCount: number;
    emojiCounts: Record<string, number>;
  }>;
  callStatus?: CallUiStatus;
  callPeerName?: string;
  callParticipantNames?: string[];
  isGroupCallActive?: boolean;
  callError?: string | null;
  isCallingAvailable?: boolean;
  isMicMuted?: boolean;
  isCameraEnabled?: boolean;
  isScreenSharing?: boolean;
  localVideoRef?: RefObject<HTMLVideoElement>;
  remoteVideoRef?: RefObject<HTMLVideoElement>;
  remoteParticipantVideos?: Array<{
    userId: string;
    displayName: string;
    stream: MediaStream;
  }>;
  onStartVideoCall?: () => void;
  onAcceptIncomingCall?: () => void;
  onRejectIncomingCall?: () => void;
  onEndCall?: () => void;
  onDismissCallBanner?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  isLoading?: boolean;
  hasMoreMessages?: boolean;
  error?: string | null;
  userPenaltyScore?: number;
  userMutedUntil?: Date | null;
}

interface ConversationItem {
  id: string;
  name: string;
  preview: string;
  time: string;
  timestamp?: number;
  avatar: string;
  avatarUrl?: string;
  isPinned?: boolean;
  mutedUntil?: Date | null;
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

interface GroupFriendOption {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

function getDisplayFileName(message: Message): string {
  const messageType = String(message.type || '');
  if (messageType.startsWith('file/')) {
    const encodedName = messageType.slice('file/'.length);
    try {
      return decodeURIComponent(encodedName) || 'Tệp đính kèm';
    } catch {
      return encodedName || 'Tệp đính kèm';
    }
  }

  if (typeof message.content === 'string' && message.content.trim().length > 0) {
    return message.content;
  }

  return 'Tệp đính kèm';
}

// ==================== CONVERSATION LIST ====================

interface ConversationListProps {
  conversations?: ConversationItem[];
  selectedId?: string;
  onSelectConversation?: (id: string) => void;
  searchTargets?: ConversationSearchTarget[];
  onSelectSearchTarget?: (target: ConversationSearchTarget) => void;
}

interface ConversationSearchTarget {
  id: string;
  type: 'friend' | 'group';
  name: string;
  avatar?: string;
  conversationId?: string;
}

function ConversationList({
  conversations = [],
  selectedId,
  onSelectConversation = () => {},
  searchTargets = [],
  onSelectSearchTarget = () => {},
}: ConversationListProps) {
  const getMuteTimeLabel = (mutedUntil: Date | null | undefined): string => {
    if (!mutedUntil) {
      return '';
    }

    const remainingMs = new Date(mutedUntil).getTime() - Date.now();
    if (remainingMs <= 0) {
      return '';
    }

    const minutes = Math.ceil(remainingMs / (60 * 1000));
    if (minutes < 60) {
      return `${minutes} phút`;
    }

    const hours = Math.ceil(minutes / 60);
    if (hours < 24) {
      return `${hours} giờ`;
    }

    const days = Math.ceil(hours / 24);
    return `${days} ngày`;
  };

  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = normalizedQuery
    ? conversations.filter((item) => {
      return item.name.toLowerCase().includes(normalizedQuery)
        || item.preview.toLowerCase().includes(normalizedQuery);
    })
    : conversations;

  const filteredSearchTargets = normalizedQuery
    ? searchTargets.filter((target) => target.name.toLowerCase().includes(normalizedQuery))
    : [];

  return (
    <aside className="h-full min-h-0 overflow-y-auto border-r border-border bg-bg-card p-4">
      <h2 className="text-2xl font-bold text-text-primary mb-4">Tin nhắn</h2>

      {/* Search */}
      <label className="mb-4 flex h-11 items-center gap-2 rounded-xl bg-bg-hover px-3 text-text-secondary border border-border-light">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm cuộc hội thoại"
          className="w-full bg-transparent text-[15px] font-medium text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </label>

      {/* Search Results */}
      {normalizedQuery && (
        <div className="mb-4 space-y-2 rounded-2xl border border-border bg-bg-hover p-2">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">Kết quả tìm kiếm</p>
          {filteredSearchTargets.length === 0 ? (
            <p className="px-2 py-2 text-sm text-text-tertiary">Không có bạn bè hoặc nhóm phù hợp.</p>
          ) : (
            filteredSearchTargets.map((target) => (
              <button
                key={`${target.type}-${target.id}`}
                type="button"
                onClick={() => {
                  onSelectSearchTarget(target);
                  setQuery('');
                }}
                className="flex w-full items-center justify-between rounded-xl bg-bg-card px-3 py-2 text-left hover:bg-bg-active"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{target.name}</p>
                  <p className="text-xs text-text-secondary">{target.type === 'group' ? 'Nhóm' : 'Bạn bè'}</p>
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                  {(target.avatar || target.name).substring(0, 2).toUpperCase()}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Conversations */}
      {filteredConversations.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-text-tertiary text-center">
          <p>{normalizedQuery ? 'Không tìm thấy hội thoại phù hợp.' : 'Không có cuộc hội thoại nào. Bắt đầu trò chuyện!'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((item) => (
            (() => {
              const isMuted = Boolean(item.mutedUntil && new Date(item.mutedUntil) > new Date());

              return (
            <button
              key={item.id}
              onClick={() => onSelectConversation(item.id)}
              className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                selectedId === item.id
                  ? 'border-accent bg-bg-active text-text-primary'
                  : 'border-transparent hover:border-border hover:bg-bg-hover'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full bg-accent text-white flex-shrink-0">
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {item.avatar}
                  </span>
                  {item.online && (
                    <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-green-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-[17px] font-bold text-text-primary">{item.name}</p>
                    <div className="flex items-center gap-2">
                      {isMuted && (
                        <span className="inline-flex items-center text-accent" aria-label="Đã tắt thông báo" title="Đã tắt thông báo">
                          <BellOffMiniIcon />
                        </span>
                      )}
                      <p className="text-xs uppercase tracking-wide text-text-tertiary whitespace-nowrap">{item.time}</p>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-[13.5px] font-medium text-text-secondary">{item.preview}</p>
                    {item.isPinned && (
                        <span className="inline-flex items-center text-accent" aria-label="Đã ghim" title="Đã ghim">
                        <PinMiniIcon />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
              );
            })()
          ))}
        </div>
      )}
    </aside>
  );
}

// ==================== CHAT PANEL ====================

function ChatPanel({
  conversationId = 'demo',
  currentUserId = 'user123',
  participantName = 'Demo User',
  participantAvatar,
  participantAvatarUrl,
  isGroupConversation = false,
  isOnline = true,
  messages = [],
  messageStatus = {},
  typingUsers = [],
  onSendMessage = async () => null,
  onCancelPendingMessage = () => {},
  onStartTyping = () => {},
  onStopTyping = () => {},
  onLoadMore = async () => {},
  isLoading = false,
  error = null,
  onInfoClick,
  onDeleteMessageForMe,
  onRecallMessage,
  onForwardMessage,
  onAvatarClick,
  onNameClick,
  inputDisabled = false,
  inputDisabledReason,
  onReactionUpsert,
  onReactionRemoveAllMine,
  onFetchReactionDetails,
  reactionUserStateByMessage = {},
  callStatus = 'idle',
  callPeerName,
  callParticipantNames = [],
  isGroupCallActive = false,
  callError = null,
  isCallingAvailable = false,
  isMicMuted = false,
  isCameraEnabled = true,
  isScreenSharing = false,
  localVideoRef,
  remoteVideoRef,
  remoteParticipantVideos = [],
  onStartVideoCall = () => {},
  onAcceptIncomingCall = () => {},
  onRejectIncomingCall = () => {},
  onEndCall = () => {},
  onDismissCallBanner = () => {},
  onToggleMic = () => {},
  onToggleCamera = () => {},
  onToggleScreenShare = () => {},
  userPenaltyScore = 0,
  userMutedUntil = null,
  hasMoreMessages = true,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const messagesRef = useRef<Message[]>(messages);
  const onLoadMoreRef = useRef(onLoadMore);
  const jumpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isJumpingRef = useRef(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [replyingTo, setReplyingTo] = useState<Message['replyTo'] | null>(null);
  const [jumpStatus, setJumpStatus] = useState<string | null>(null);

  const getMessageSenderId = useCallback((message: Message) => {
    const sender = message.senderId as unknown;
    if (sender && typeof sender === 'object') {
      return String((sender as { _id?: string })._id || '');
    }
    return String(message.senderId || '');
  }, []);

  const messagesForDisplay = useMemo(() => {
    const lastMessageIndex = messages.length - 1;

    return messages.map((message, index) => {
      const isBottomMessage = index === lastMessageIndex;
      const isOwnBottomMessage = isBottomMessage && getMessageSenderId(message) === String(currentUserId);

      if (isOwnBottomMessage) {
        return message;
      }

      const hasReadPreview = Array.isArray(message.readByPreview) && message.readByPreview.length > 0;
      const hasReadBy = Array.isArray(message.readBy) && message.readBy.length > 0;

      if (!hasReadPreview && !hasReadBy) {
        return message;
      }

      return {
        ...message,
        readByPreview: [],
        readBy: [],
      };
    });
  }, [currentUserId, getMessageSenderId, messages]);

  messagesRef.current = messages;

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    return () => {
      if (jumpTimeoutRef.current) {
        clearTimeout(jumpTimeoutRef.current);
      }
    };
  }, []);
  const [activeSpeakerUserId, setActiveSpeakerUserId] = useState<string | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers, shouldAutoScroll]);

  // Detect if user scrolled up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // If scrolled to bottom (within 100px), enable auto-scroll
    setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  // Check if message can be recalled (within 5 minutes)
  const canRecallMessage = (createdAt: string): boolean => {
    const messageTime = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const fiveMinutesMs = 5 * 60 * 1000;
    return (now - messageTime) < fiveMinutesMs;
  };

  const isRemovedFromGroup = inputDisabled && inputDisabledReason?.toLowerCase().includes('bị xóa khỏi nhóm');
  const hasRemovedNoticeInMessages = messages.some((message) => message.content.toLowerCase().includes('bị xóa khỏi nhóm'));
  const isCallVisible = callStatus !== 'idle';
  const isTerminalCallState = callStatus === 'ended' || callStatus === 'missed' || callStatus === 'rejected';
  const shouldRenderCallMedia = callStatus === 'outgoing' || callStatus === 'connecting' || callStatus === 'connected' || callStatus === 'incoming';
  const callStatusLabel: Record<Exclude<CallUiStatus, 'idle'>, string> = {
    outgoing: 'Đang đổ chuông...',
    incoming: 'Cuộc gọi đến',
    connecting: 'Đang kết nối...',
    connected: 'Đang trong cuộc gọi',
    ended: 'Đã kết thúc',
    missed: 'Nhỡ cuộc gọi',
    rejected: 'Đã từ chối',
  };

  useEffect(() => {
    if (!isGroupCallActive || callStatus !== 'connected' || remoteParticipantVideos.length === 0) {
      setActiveSpeakerUserId(null);
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    const AudioContextClass = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    const audioContext = new AudioContextClass();
    type AudioMeter = {
      userId: string;
      analyser: AnalyserNode;
      data: Uint8Array<ArrayBuffer>;
      source: MediaStreamAudioSourceNode;
    };

    const meters: AudioMeter[] = [];
    remoteParticipantVideos.forEach((participant) => {
      const audioTracks = participant.stream.getAudioTracks();
      if (audioTracks.length === 0) {
        return;
      }

      const audioOnlyStream = new MediaStream(audioTracks);
      const source = audioContext.createMediaStreamSource(audioOnlyStream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      meters.push({
        userId: participant.userId,
        analyser,
        data: new Uint8Array(analyser.frequencyBinCount) as Uint8Array<ArrayBuffer>,
        source,
      });
    });

    if (meters.length === 0) {
      setActiveSpeakerUserId(null);
      void audioContext.close();
      return;
    }

    const interval = setInterval(() => {
      let maxVolume = 0;
      let loudestUserId: string | null = null;

      meters.forEach((meter) => {
        meter.analyser.getByteTimeDomainData(meter.data);
        let sum = 0;
        for (const value of meter.data) {
          const normalized = (value - 128) / 128;
          sum += normalized * normalized;
        }
        const rms = Math.sqrt(sum / meter.data.length);
        if (rms > maxVolume) {
          maxVolume = rms;
          loudestUserId = meter.userId;
        }
      });

      if (maxVolume < 0.02) {
        setActiveSpeakerUserId(null);
        return;
      }

      setActiveSpeakerUserId(loudestUserId);
    }, 220);

    return () => {
      clearInterval(interval);
      meters.forEach((meter) => {
        meter.source.disconnect();
        meter.analyser.disconnect();
      });
      void audioContext.close();
    };
  }, [callStatus, isGroupCallActive, remoteParticipantVideos]);

  const activeSpeakerName = activeSpeakerUserId
    ? remoteParticipantVideos.find((participant) => participant.userId === activeSpeakerUserId)?.displayName
    : null;
  // Report message
  const [reportStatus, setReportStatus] = useState<string | null>(null);
  const handleReportMessage = useCallback(async (messageId: string) => {
    try {
      const res = await reportMessage(messageId);
      setReportStatus(res.result === 'block' ? '🚫 Tin nhắn đã bị xóa do vi phạm.' : '✅ Đã gửi báo cáo. Không phát hiện vi phạm.');
    } catch {
      setReportStatus('❌ Không thể gửi báo cáo. Vui lòng thử lại.');
    } finally {
      setTimeout(() => setReportStatus(null), 4000);
    }
  }, []);

  // React to message
  const handleReactMessage = useCallback(async (messageId: string, reactionType: string) => {
    try {
      await reactMessage(messageId, reactionType);
    } catch {
      console.error('Failed to react to message');
    }
  }, []);

  const handleReplyMessage = useCallback((message: Message) => {
    const senderDisplayName = (message as Message & { senderDisplayName?: string }).senderDisplayName
      || (String(message.senderId) === String(currentUserId)
        ? 'Ban'
        : (!isGroupConversation ? participantName : undefined));

    setReplyingTo({
      messageRef: message.idempotencyKey || message._id,
      messageId: message._id,
      senderId: String(message.senderId),
      senderDisplayName,
      contentPreview: (message.content || '').slice(0, 160),
      type: message.type,
      isDeleted: false,
    });
  }, [currentUserId, isGroupConversation, participantName]);

  const showJumpStatus = useCallback((message: string) => {
    setJumpStatus(message);
    if (jumpTimeoutRef.current) {
      clearTimeout(jumpTimeoutRef.current);
    }
    jumpTimeoutRef.current = setTimeout(() => {
      setJumpStatus(null);
      jumpTimeoutRef.current = null;
    }, 3500);
  }, []);

  const scrollToMessageElement = useCallback((targetMessageId: string) => {
    const tryScroll = () => {
      const element = messageRowRefs.current[targetMessageId];
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    requestAnimationFrame(tryScroll);
    setTimeout(tryScroll, 120);
  }, []);

  const handleJumpToMessage = useCallback(async (messageRef: string) => {
    if (!messageRef || isJumpingRef.current) {
      return;
    }

    const findTarget = () => messagesRef.current.find(
      (msg) => msg.idempotencyKey === messageRef || msg._id === messageRef,
    );

    const immediateTarget = findTarget();
    if (immediateTarget) {
      scrollToMessageElement(immediateTarget._id);
      return;
    }

    isJumpingRef.current = true;

    try {
      let previousCount = messagesRef.current.length;
      let stagnantTurns = 0;
      const maxAttempts = 20;

      const waitForMessagesGrowth = async (baselineCount: number): Promise<boolean> => {
        const start = Date.now();
        const timeoutMs = 1200;

        while (Date.now() - start < timeoutMs) {
          if (messagesRef.current.length > baselineCount) {
            return true;
          }
          await new Promise<void>((resolve) => {
            setTimeout(() => resolve(), 60);
          });
        }

        return messagesRef.current.length > baselineCount;
      };

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const beforeLoadCount = messagesRef.current.length;
        await onLoadMoreRef.current();
        const hasGrowth = await waitForMessagesGrowth(beforeLoadCount);

        const found = findTarget();
        if (found) {
          scrollToMessageElement(found._id);
          return;
        }

        const currentCount = messagesRef.current.length;
        if (!hasGrowth || currentCount <= previousCount) {
          stagnantTurns += 1;
        } else {
          stagnantTurns = 0;
          previousCount = currentCount;
        }

        // No growth in consecutive attempts: likely no more accessible history for this user.
        if (stagnantTurns >= 3) {
          break;
        }
      }

      showJumpStatus('Tin nhan khong the truy cap.');
    } catch {
      showJumpStatus('Khong the tai them tin nhan de di den tin goc.');
    } finally {
      isJumpingRef.current = false;
    }
  }, [scrollToMessageElement, showJumpStatus]);

  return (
    <article className="relative mx-auto flex h-full w-full max-w-[1440px] min-h-0 min-w-0 flex-col overflow-hidden rounded-[2rem] border border-border bg-bg-card shadow-sm">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border bg-bg-card px-5 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`relative h-11 w-11 overflow-hidden rounded-full bg-accent-light ${isGroupConversation ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={isGroupConversation ? onAvatarClick : undefined}
            title={isGroupConversation ? 'Đổi ảnh nhóm' : undefined}
          >
            {participantAvatarUrl ? (
              <img src={participantAvatarUrl} alt={participantName} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-accent">
                {participantAvatar ? participantAvatar[0] : participantName[0]}
              </span>
            )}
            {isOnline && (
              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#33e2b3]" />
            )}
          </button>
          <div>
            <button
              type="button"
              className={`text-left text-lg font-bold text-text-primary ${isGroupConversation ? 'cursor-pointer hover:text-accent' : 'cursor-default'}`}
              onClick={isGroupConversation ? onNameClick : undefined}
              title={isGroupConversation ? 'Đổi tên nhóm' : undefined}
            >
              {participantName}
            </button>
            <p className="text-[13px] font-medium text-text-tertiary">
              {isOnline ? 'đang hoạt động' : 'ngoại tuyến'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-text-secondary">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-hover transition-colors hover:bg-border-light disabled:cursor-not-allowed disabled:opacity-45"
            title="Gọi thoại"
            disabled={!isCallingAvailable}
            onClick={onStartVideoCall}
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-hover transition-colors hover:bg-border-light disabled:cursor-not-allowed disabled:opacity-45"
            title="Gọi video"
            disabled={!isCallingAvailable}
            onClick={onStartVideoCall}
          >
            <VideoIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-bg-hover transition-colors hover:bg-border-light"
            title="Info"
            onClick={onInfoClick}
          >
            <InfoIcon className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* Report Notification Toast */}
      {reportStatus && (
        <div className="bg-bg-active border-b border-border px-5 py-2 text-sm text-text-primary flex items-center justify-between">
          <span>{reportStatus}</span>
          <button onClick={() => setReportStatus(null)} className="text-text-secondary hover:text-text-primary">✕</button>
        </div>
      )}

      {jumpStatus && (
        <div className="bg-bg-hover border-b border-border px-5 py-2 text-sm text-text-secondary flex items-center justify-between">
          <span>{jumpStatus}</span>
          <button onClick={() => setJumpStatus(null)} className="text-text-tertiary hover:text-text-primary">✕</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-700 px-6 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {inputDisabled && (
        <div className="border-b border-border bg-bg-hover px-6 py-2 text-sm text-text-secondary">
          {inputDisabledReason ?? 'Bạn không thể nhắn tin trong hội thoại này.'}
        </div>
      )}

      {isCallVisible && (
        <div
          className={`absolute inset-0 z-[40] flex px-3 py-3 sm:px-5 sm:py-4 ${
            isTerminalCallState
              ? 'items-start justify-center bg-transparent pointer-events-none'
              : 'items-center justify-center bg-black/60 backdrop-blur-[2px]'
          }`}
        >
          <div
            className={`pointer-events-auto w-full overflow-hidden rounded-2xl border border-border bg-bg-card text-text-primary shadow-2xl ${
              isTerminalCallState ? 'max-w-xl' : 'max-w-3xl'
            }`}
          >
            <div className="border-b border-border px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {callStatusLabel[callStatus]}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {callPeerName
                      ? (isGroupCallActive ? `Nhóm gọi: ${callPeerName}` : `Người tham gia: ${callPeerName}`)
                      : 'Đang đồng bộ thông tin cuộc gọi'}
                  </p>
                  {isGroupCallActive && callParticipantNames.length > 0 && (
                    <p className="mt-1 text-xs text-text-secondary">
                      Thành viên: {callParticipantNames.join(', ')}
                    </p>
                  )}
                  {isGroupCallActive && activeSpeakerName && callStatus === 'connected' && (
                    <p className="mt-1 text-xs font-semibold text-text-primary">
                      Đang nói: {activeSpeakerName}
                    </p>
                  )}
                  {callError && <p className="mt-1 text-xs text-text-primary">{callError}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isTerminalCallState && (
                    <button
                      type="button"
                      onClick={onDismissCallBanner}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-accent"
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                      Đóng
                    </button>
                  )}

                  {callStatus === 'incoming' && (
                    <>
                      <button
                        type="button"
                        onClick={onAcceptIncomingCall}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-bg-hover"
                      >
                        <CheckIcon className="h-3.5 w-3.5" />
                        Nhận
                      </button>
                      <button
                        type="button"
                        onClick={onRejectIncomingCall}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-red-500/20"
                      >
                        <CloseIcon className="h-3.5 w-3.5" />
                        Từ chối
                      </button>
                    </>
                  )}

                  {callStatus === 'connected' && (
                    <>
                      <button
                        type="button"
                        onClick={onToggleMic}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-accent"
                      >
                        <MicIcon className="h-3.5 w-3.5" />
                        {isMicMuted ? 'Bật mic' : 'Tắt mic'}
                      </button>
                      <button
                        type="button"
                        onClick={onToggleCamera}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-accent"
                      >
                        <CameraControlIcon className="h-3.5 w-3.5" />
                        {isCameraEnabled ? 'Tắt camera' : 'Bật camera'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void onToggleScreenShare();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-bg-hover px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-accent"
                      >
                        <ScreenShareIcon className="h-3.5 w-3.5" />
                        {isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
                      </button>
                    </>
                  )}

                  {callStatus !== 'ended' && callStatus !== 'missed' && callStatus !== 'rejected' && (
                    <button
                      type="button"
                      onClick={onEndCall}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-text-primary hover:bg-red-500/20"
                    >
                      <EndCallIcon className="h-3.5 w-3.5" />
                      Kết thúc
                    </button>
                  )}
                </div>
              </div>
            </div>

            {shouldRenderCallMedia && (
              <div className="grid gap-3 p-4 sm:grid-cols-[240px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-44 w-full object-cover"
                  />
                  <p className="border-t border-border px-2 py-1 text-[11px] text-text-tertiary">Camera của bạn</p>
                </div>

                {isGroupCallActive ? (
                  <div className="grid max-h-[52vh] grid-cols-1 gap-2 overflow-auto rounded-xl border border-border bg-bg-card p-2 sm:grid-cols-2">
                    {remoteParticipantVideos.length === 0 && (
                      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-primary sm:col-span-2">
                        Đang chờ thành viên khác tham gia...
                      </div>
                    )}
                    {remoteParticipantVideos.map((participant) => (
                      <div
                        key={participant.userId}
                        className={`overflow-hidden rounded-lg border bg-bg-card ${
                          activeSpeakerUserId === participant.userId
                            ? 'border-accent shadow-sm ring-1 ring-accent'
                            : 'border-border'
                        }`}
                      >
                        <video
                          autoPlay
                          playsInline
                          className="h-40 w-full object-cover"
                          ref={(node) => {
                            if (!node) {
                              return;
                            }
                            if (node.srcObject !== participant.stream) {
                              node.srcObject = participant.stream;
                            }
                          }}
                        />
                        <p className="border-t border-border px-2 py-1 text-[11px] text-text-tertiary">
                          {participant.displayName}
                          {activeSpeakerUserId === participant.userId ? ' - đang nói' : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-xl border border-border bg-bg-card">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="h-44 w-full object-cover sm:h-full"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto space-y-2 px-5 py-4"
      >
        {/* Load More Button */}
        {messages.length > 0 && hasMoreMessages && (
          <div className="flex justify-center mb-4">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="load-more-button zync-glass-subtle rounded-lg px-4 py-2 text-sm"
            >
              {isLoading ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {isRemovedFromGroup && !hasRemovedNoticeInMessages && (
              <div className="my-3 flex flex-col items-center gap-1.5">
              </div>
            )}

            {messagesForDisplay.map((message) => (
              <div
                key={message._id}
                ref={(node) => {
                  messageRowRefs.current[message._id] = node;
                }}
              >
                <MessageItem
                  message={message}
                  isSender={String(message.senderId) === String(currentUserId)}
                  canRecall={canRecallMessage(message.createdAt)}
                  senderAvatar={participantAvatar}
                  messageStatus={messageStatus}
                  onDeleteForMe={onDeleteMessageForMe}
                  onRecall={onRecallMessage}
                  onForward={onForwardMessage}
                  onReply={handleReplyMessage}
                  onJumpToMessage={handleJumpToMessage}
                  reactionUserState={reactionUserStateByMessage[message._id] || message.reactionUserState}
                  onReactionUpsert={onReactionUpsert}
                  onReactionRemoveAllMine={onReactionRemoveAllMine}
                  onFetchReactionDetails={onFetchReactionDetails}
                  onReport={handleReportMessage}
                  onReact={handleReactMessage}
                />
              </div>
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator
                userNames={typingUsers.map((u) => u.displayName)}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Moderation Penalty Bar */}
      <div className="border-t border-border bg-bg-hover px-4 py-1.5">
        <div className="mb-1 flex items-center justify-between text-[11px] text-text-secondary">
          <span>Mức độ vi phạm tiêu chuẩn cộng đồng</span>
          <span className={userPenaltyScore >= 80 ? 'font-semibold text-red-500' : ''}>
            {userPenaltyScore}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              userPenaltyScore >= 80 ? 'bg-red-500' :
              userPenaltyScore >= 50 ? 'bg-orange-500' :
              userPenaltyScore > 0 ? 'bg-yellow-500' : 'bg-accent'
            }`}
            style={{ width: `${Math.min(Math.max(userPenaltyScore, 0), 100)}%` }}
          />
        </div>
        {userMutedUntil && new Date(userMutedUntil) > new Date() && (
          <p className="mt-1 text-[11px] font-medium text-red-500">
            Bạn đang bị cấm chat đến {new Date(userMutedUntil).toLocaleTimeString('vi-VN')}
          </p>
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        onSend={(content, type, mediaUrl, options) => {
          return onSendMessage(content, type as MessageType, mediaUrl, options);
        }}
        onCancelPendingMessage={onCancelPendingMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        isLoading={isLoading}
        disabled={!!userMutedUntil && new Date(userMutedUntil) > new Date()}
      />
    </article>
  );
}

// ==================== MAIN COMPONENT ====================

interface HomeDashboardChatPanelProps {
  conversations?: ConversationItem[];
  selectedConversationId?: string;
  onSelectConversation?: (id: string) => void;
  searchTargets?: ConversationSearchTarget[];
  onSelectSearchTarget?: (target: ConversationSearchTarget) => void;
  onToggleConversationPin?: (conversationId: string, shouldPin: boolean) => Promise<void>;
  onMuteConversation?: (conversationId: string, duration: '1h' | '4h' | '8h' | 'until_enabled') => Promise<void>;
  onUnmuteConversation?: (conversationId: string) => Promise<void>;
  isConversationPinned?: boolean;
  conversationMutedUntil?: Date | null;
  friends?: GroupFriendOption[];
  onCreateGroup?: (name: string, memberIds: string[]) => Promise<{ _id: string }>;
  onUpdateGroup?: (groupId: string, payload: { name?: string; avatarUrl?: string | null }) => Promise<void>;
  onAddGroupMembers?: (groupId: string, memberIds: string[]) => Promise<void>;
  onUpdateGroupMemberRole?: (groupId: string, targetUserId: string, role: 'admin' | 'member') => Promise<void>;
  onUpdateGroupMemberApproval?: (groupId: string, memberApprovalEnabled: boolean) => Promise<void>;
  onRemoveGroupMember?: (groupId: string, targetUserId: string) => Promise<void>;
  onDisbandGroup?: (groupId: string) => Promise<void>;
  onLeaveGroup?: (groupId: string) => Promise<void>;
  isCreatingGroup?: boolean;
  onLoadMore?: () => Promise<void>;
  chatPanelProps?: Partial<ChatPanelProps>;
}

interface CreateGroupModalProps {
  open: boolean;
  friends: GroupFriendOption[];
  selectedFriendIds: string[];
  groupName: string;
  query: string;
  isCreatingGroup: boolean;
  onClose: () => void;
  onChangeGroupName: (value: string) => void;
  onChangeQuery: (value: string) => void;
  onToggleFriend: (friendId: string) => void;
  onSubmit: () => void;
}

interface AddMembersModalProps {
  open: boolean;
  friends: GroupFriendOption[];
  existingMemberIds: string[];
  selectedMemberIds: string[];
  query: string;
  isSubmitting: boolean;
  onClose: () => void;
  onChangeQuery: (value: string) => void;
  onToggleMember: (friendId: string) => void;
  onSubmit: () => void;
}

interface ManageGroupModalProps {
  open: boolean;
  members: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  adminIds: string[];
  creatorId?: string;
  isSubmitting: boolean;
  groupName: string;
  onClose: () => void;
  onAssignRole: (memberId: string, role: 'admin' | 'member') => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onDisbandGroup: () => Promise<void>;
}

function CreateGroupModal({
  open,
  friends,
  selectedFriendIds,
  groupName,
  query,
  isCreatingGroup,
  onClose,
  onChangeGroupName,
  onChangeQuery,
  onToggleFriend,
  onSubmit,
}: CreateGroupModalProps) {
  if (!open) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredFriends = normalizedQuery
    ? friends.filter((friend) => friend.displayName.toLowerCase().includes(normalizedQuery))
    : friends;

  const selectedSet = new Set(selectedFriendIds);
  const selectedFriends = friends.filter((friend) => selectedSet.has(friend.id));
  const canSubmit = selectedFriendIds.length >= 2 && selectedFriendIds.length <= 100 && !isCreatingGroup;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-2xl font-semibold text-text-primary">Tạo nhóm</h3>
          <button
            type="button"
            className="rounded-full bg-bg-hover px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-active"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>

        <div className="px-6 py-4">
          <input
            value={groupName}
            onChange={(e) => onChangeGroupName(e.target.value)}
            placeholder="Nhập tên nhóm"
            className="mb-3 h-11 w-full rounded-xl border border-border bg-bg-hover px-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
          />

          <input
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Nhập tên bạn để tìm"
            className="h-11 w-full rounded-xl border border-border bg-bg-hover px-4 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-accent"
          />

          <p className="mt-3 text-sm text-text-secondary">
            Đã chọn {selectedFriendIds.length}/100 bạn. Cần tối thiểu 2 bạn để tạo nhóm.
          </p>
        </div>

        <div className="grid gap-4 border-t border-border px-6 py-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-border bg-bg-hover p-3">
            <p className="mb-3 text-sm font-semibold text-text-primary">Bạn bè của tôi</p>
            <div className="space-y-2">
              {filteredFriends.map((friend) => {
                const isSelected = selectedSet.has(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => onToggleFriend(friend.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                      isSelected
                        ? 'border-accent bg-bg-active'
                        : 'border-border hover:border-accent-light hover:bg-bg-active'
                    }`}
                  >
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                      isSelected ? 'border-accent bg-accent text-white' : 'border-border text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-accent">
                      {friend.displayName.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-medium text-text-primary">{friend.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-border bg-bg-hover p-3">
            <p className="mb-3 text-sm font-semibold text-text-primary">Đã chọn</p>
            {selectedFriends.length === 0 ? (
              <p className="text-sm text-text-tertiary">Chưa có thành viên nào được chọn.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => onToggleFriend(friend.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-bg-active px-3 py-1 text-sm text-text-primary"
                  >
                    <span>{friend.displayName}</span>
                    <span>x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-bg-hover px-6 py-2 font-semibold text-text-secondary hover:bg-bg-active"
            onClick={onClose}
            disabled={isCreatingGroup}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-6 py-2 font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isCreatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMembersModal({
  open,
  friends,
  existingMemberIds,
  selectedMemberIds,
  query,
  isSubmitting,
  onClose,
  onChangeQuery,
  onToggleMember,
  onSubmit,
}: AddMembersModalProps) {
  if (!open) return null;

  const existingSet = new Set(existingMemberIds);
  const selectedSet = new Set(selectedMemberIds);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredFriends = normalizedQuery
    ? friends.filter((friend) => friend.displayName.toLowerCase().includes(normalizedQuery))
    : friends;

  const canSubmit = selectedMemberIds.length > 0 && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-2xl font-semibold text-text-primary">Thêm thành viên</h3>
          <button
            type="button"
            className="rounded-full bg-bg-hover px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-active"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-border bg-bg-hover px-3 text-text-secondary">
            <SearchIcon />
            <input
              type="text"
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Nhập tên hiển thị hoặc @username"
              className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            />
          </label>
        </div>

        <div className="max-h-[420px] overflow-y-auto border-t border-border px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-text-primary">Trò chuyện gần đây</p>
          <div className="space-y-2">
            {filteredFriends.map((friend) => {
              const isExisting = existingSet.has(friend.id);
              const isSelected = selectedSet.has(friend.id);

              return (
                <button
                  key={friend.id}
                  type="button"
                  disabled={isExisting}
                  onClick={() => onToggleMember(friend.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    isExisting
                      ? 'cursor-not-allowed border-border bg-bg-hover opacity-70'
                      : isSelected
                        ? 'border-accent bg-bg-active'
                        : 'border-border hover:border-accent-light hover:bg-bg-active'
                  }`}
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                    isExisting || isSelected
                      ? 'border-accent bg-accent text-white'
                      : 'border-border text-transparent'
                  }`}>
                    ✓
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent-light text-sm font-semibold text-accent">
                    {friend.displayName.substring(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{friend.displayName}</p>
                    {isExisting && <p className="text-xs text-text-tertiary">Đã tham gia</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-bg-hover px-6 py-2 font-semibold text-text-secondary hover:bg-bg-active"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-accent px-6 py-2 font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Đang thêm...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupMembersPreview({
  members,
  adminIds,
  creatorId,
}: {
  members: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  adminIds: string[];
  creatorId?: string;
}) {
  if (members.length === 0) {
    return <p className="text-sm text-text-primary">Nhóm chưa có thành viên.</p>;
  }

  const adminSet = new Set(adminIds);

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isCreator = creatorId === member._id;
        const isAdmin = adminSet.has(member._id);

        return (
          <div key={member._id} className="flex items-center justify-between gap-3 rounded-xl bg-bg-hover px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{member.displayName}</p>
              <p className="text-xs text-text-tertiary">
                {isCreator ? 'Người tạo nhóm' : isAdmin ? 'Quản trị viên' : 'Thành viên'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ManageGroupModal({
  open,
  members,
  adminIds,
  creatorId,
  isSubmitting,
  groupName,
  onClose,
  onAssignRole,
  onRemoveMember,
  onDisbandGroup,
}: ManageGroupModalProps) {
  if (!open) return null;

  const adminSet = new Set(adminIds);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-3xl rounded-2xl border border-border bg-bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-2xl font-semibold text-text-primary">Quản lý nhóm</h3>
          <button
            type="button"
            className="rounded-full bg-bg-hover px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-active"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </button>
        </div>

        <div className="max-h-[430px] overflow-y-auto px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-text-primary">Thành viên nhóm</p>
          <div className="space-y-2">
            {members.map((member) => {
              const isCreator = creatorId === member._id;
              const isAdmin = adminSet.has(member._id);

              return (
                <div
                  key={member._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-hover px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">{member.displayName}</p>
                    <p className="text-xs text-text-secondary">
                      {isCreator ? 'Người tạo nhóm' : isAdmin ? 'Quản trị viên' : 'Thành viên'}
                    </p>
                  </div>

                  {!isCreator && (
                    <div className="flex flex-wrap items-center gap-2">
                      {isAdmin ? (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => onAssignRole(member._id, 'member')}
                          className="rounded-lg bg-bg-active px-3 py-1 text-xs font-semibold text-text-primary hover:bg-bg-hover disabled:opacity-60"
                        >
                          Gỡ quyền
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => onAssignRole(member._id, 'admin')}
                          className="rounded-lg bg-accent px-3 py-1 text-xs font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
                        >
                          Gán quyền
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => onRemoveMember(member._id)}
                        className="rounded-lg bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-500 hover:bg-red-500/20 disabled:opacity-60"
                      >
                        Xóa thành viên
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="text-xs text-text-tertiary">Nhóm: {groupName}</p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onDisbandGroup}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-60"
          >
            Giải tán nhóm
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeDashboardChatPanel({
  conversations,
  selectedConversationId = 'c1',
  onSelectConversation = () => {},
  searchTargets = [],
  onSelectSearchTarget = () => {},
  onToggleConversationPin,
  onMuteConversation,
  onUnmuteConversation,
  isConversationPinned = false,
  conversationMutedUntil = null,
  friends = [],
  onCreateGroup,
  onUpdateGroup,
  onAddGroupMembers,
  onUpdateGroupMemberRole,
  onUpdateGroupMemberApproval,
  onRemoveGroupMember,
  onDisbandGroup,
  onLeaveGroup,
  isCreatingGroup = false,
  onLoadMore,
  chatPanelProps = {},
}: HomeDashboardChatPanelProps = {}) {
  const conversationItems = conversations ?? [];
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [isManageGroupOpen, setIsManageGroupOpen] = useState(false);
  const [isRenameGroupOpen, setIsRenameGroupOpen] = useState(false);
  const [renameGroupDraft, setRenameGroupDraft] = useState('');
  const [isMuteModalOpen, setIsMuteModalOpen] = useState(false);
  const [isLeaveGroupModalOpen, setIsLeaveGroupModalOpen] = useState(false);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isMembersViewOpen, setIsMembersViewOpen] = useState(false);
  const [archiveTab, setArchiveTab] = useState<'media' | 'files' | 'links'>('media');
  const [groupManageError, setGroupManageError] = useState<string | null>(null);
  const [groupManageSuccess, setGroupManageSuccess] = useState<string | null>(null);
  const [isRemoveMemberConfirmOpen, setIsRemoveMemberConfirmOpen] = useState(false);
  const [removeMemberTargetId, setRemoveMemberTargetId] = useState<string | null>(null);
  const [isDisbandConfirmOpen, setIsDisbandConfirmOpen] = useState(false);
  const [locallyRemovedConversationIds, setLocallyRemovedConversationIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isUploadingGroupAvatar, setIsUploadingGroupAvatar] = useState(false);

  const groupAvatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsManageGroupOpen(false);
    setGroupManageError(null);
    setGroupManageSuccess(null);
    setIsArchiveOpen(false);
    setIsMembersViewOpen(false);
  }, [selectedConversationId]);

  const visibleConversations = conversationItems.filter(
    (item) => !locallyRemovedConversationIds.includes(item.id),
  );
  const visibleSearchTargets = searchTargets.filter((target) => {
    if (target.type !== 'group') {
      return true;
    }

    const groupId = target.conversationId ?? target.id;
    return !locallyRemovedConversationIds.includes(groupId);
  });

  const selectedConversation = visibleConversations.find((item) => item.id === selectedConversationId);

  const uploadGroupAvatar = async (file: File): Promise<string> => {
    const signatureData = await generateUploadSignature('image');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signatureData.apiKey);
    formData.append('signature', signatureData.signature);
    formData.append('timestamp', signatureData.timestamp.toString());
    formData.append('folder', signatureData.folder);

    const uploadedData = await new Promise<{ public_id: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`);

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText) as { public_id: string });
          } catch {
            reject(new Error('Cloudinary upload failed: invalid response'));
          }
          return;
        }

        reject(new Error('Cloudinary upload failed'));
      };

      xhr.onerror = () => {
        reject(new Error('Cloudinary upload failed: network error'));
      };

      xhr.send(formData);
    });

    const verifyResult = await verifyUpload(uploadedData.public_id, 'image');
    return verifyResult.secureUrl;
  };

  const handleOpenGroupAvatarPicker = () => {
    if (!isGroupConversation || !selectedConversationId || !onUpdateGroup || isCreatingGroup) {
      return;
    }

    groupAvatarInputRef.current?.click();
  };

  const handleGroupAvatarFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = '';

    if (!file || !selectedConversationId || !onUpdateGroup) {
      return;
    }

    try {
      setGroupManageError(null);
      setIsUploadingGroupAvatar(true);
      const secureUrl = await uploadGroupAvatar(file);
      await onUpdateGroup(selectedConversationId, { avatarUrl: secureUrl });
    } catch {
      setGroupManageError('Không thể cập nhật ảnh nhóm. Vui lòng thử lại.');
    } finally {
      setIsUploadingGroupAvatar(false);
    }
  };

  const handleChangeGroupName = () => {
    if (!isGroupConversation || !selectedConversationId || !onUpdateGroup || isCreatingGroup) {
      return;
    }

    setRenameGroupDraft(selectedConversation?.name ?? 'Nhóm');
    setIsRenameGroupOpen(true);
  };

  const handleSubmitGroupNameChange = async () => {
    if (!isGroupConversation || !selectedConversationId || !onUpdateGroup || isCreatingGroup) {
      return;
    }

    const suggestedName = selectedConversation?.name ?? 'Nhóm';
    const trimmedName = renameGroupDraft.trim();
    if (!trimmedName) {
      setGroupManageError('Tên nhóm không được để trống.');
      return;
    }

    if (trimmedName === suggestedName) {
      return;
    }

    try {
      setGroupManageError(null);
      await onUpdateGroup(selectedConversationId, { name: trimmedName });
      setIsRenameGroupOpen(false);
    } catch {
      setGroupManageError('Không thể cập nhật tên nhóm. Vui lòng thử lại.');
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      }

      if (prev.length >= 100) {
        return prev;
      }

      return [...prev, friendId];
    });
  };

  const openCreateGroupModal = () => {
    setGroupName('');
    setGroupQuery('');
    setSelectedFriendIds([]);
    setIsCreateGroupOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!onCreateGroup) {
      return;
    }

    const trimmedName = groupName.trim();
    const finalName = trimmedName.length > 0 ? trimmedName : 'Nhóm mới';
    await onCreateGroup(finalName, selectedFriendIds);
    setIsCreateGroupOpen(false);
    setIsInfoOpen(false);
  };

  const openAddMembersModal = () => {
    setMemberSearchQuery('');
    setSelectedAddMemberIds([]);
    setIsAddMembersOpen(true);
  };

  const toggleAddMemberSelection = (friendId: string) => {
    setSelectedAddMemberIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      }
      return [...prev, friendId];
    });
  };

  const handleConfirmAddMembers = async () => {
    if (!onAddGroupMembers || !selectedConversationId || selectedAddMemberIds.length === 0) {
      return;
    }

    try {
      setGroupManageError(null);
      await onAddGroupMembers(selectedConversationId, selectedAddMemberIds);
      setIsAddMembersOpen(false);
    } catch {
      setGroupManageError(memberApprovalEnabled
        ? 'Nhóm đang bật duyệt thành viên. Chỉ chủ nhóm mới có thể duyệt và thêm thành viên.'
        : 'Không thể thêm thành viên. Vui lòng thử lại.');
    }
  };

  const handleToggleMemberApproval = async () => {
    if (!onUpdateGroupMemberApproval || !selectedConversationId || !isCurrentUserGroupCreator) {
      return;
    }

    try {
      setGroupManageError(null);
      await onUpdateGroupMemberApproval(selectedConversationId, !memberApprovalEnabled);
    } catch {
      setGroupManageError('Không thể cập nhật chế độ duyệt thành viên. Vui lòng thử lại.');
    }
  };

  const handleAssignMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    if (!onUpdateGroupMemberRole || !selectedConversationId) {
      return;
    }

    try {
      setGroupManageError(null);
      await onUpdateGroupMemberRole(selectedConversationId, memberId, role);
    } catch {
      setGroupManageError('Không thể cập nhật quyền thành viên. Vui lòng thử lại.');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!onRemoveGroupMember || !selectedConversationId) {
      return;
    }

    setRemoveMemberTargetId(memberId);
    setIsRemoveMemberConfirmOpen(true);
  };

  const handleConfirmRemoveMember = async () => {
    if (!onRemoveGroupMember || !selectedConversationId || !removeMemberTargetId) {
      return;
    }

    try {
      setGroupManageError(null);
      await onRemoveGroupMember(selectedConversationId, removeMemberTargetId);
      setIsRemoveMemberConfirmOpen(false);
      setRemoveMemberTargetId(null);
    } catch {
      setGroupManageError('Không thể xóa thành viên. Vui lòng thử lại.');
    }
  };

  const handleDisbandGroup = async () => {
    if (!onDisbandGroup || !selectedConversationId) {
      return;
    }

    setIsDisbandConfirmOpen(true);
  };

  const handleConfirmDisbandGroup = async () => {
    if (!onDisbandGroup || !selectedConversationId) {
      return;
    }

    try {
      setGroupManageError(null);
      setGroupManageSuccess(null);
      await onDisbandGroup(selectedConversationId);

      setLocallyRemovedConversationIds((prev) => (
        prev.includes(selectedConversationId) ? prev : [...prev, selectedConversationId]
      ));

      const fallbackConversationId = visibleConversations
        .find((conversation) => conversation.id !== selectedConversationId)?.id;
      onSelectConversation(fallbackConversationId ?? '');

      setIsManageGroupOpen(false);
      setIsInfoOpen(false);
      setIsDisbandConfirmOpen(false);
      setGroupManageSuccess('Nhóm đã giải tán');
    } catch {
      setGroupManageError('Không thể giải tán nhóm. Vui lòng thử lại.');
    }
  };

  const handleLeaveGroup = async () => {
    if (!onLeaveGroup || !selectedConversationId || !isGroupConversation) {
      return;
    }

    setIsLeaveGroupModalOpen(true);
  };

  const handleConfirmLeaveGroup = async () => {
    if (!onLeaveGroup || !selectedConversationId || !isGroupConversation) {
      return;
    }

    try {
      setGroupManageError(null);
      await onLeaveGroup(selectedConversationId);
      setIsLeaveGroupModalOpen(false);
      setIsInfoOpen(false);
      setIsManageGroupOpen(false);
    } catch {
      setGroupManageError('Không thể rời nhóm. Vui lòng thử lại.');
    }
  };

  const handleTogglePinConversation = async () => {
    if (!selectedConversationId || !onToggleConversationPin) {
      return;
    }

    try {
      setGroupManageError(null);
      await onToggleConversationPin(selectedConversationId, !isConversationPinned);
    } catch {
      setGroupManageError('Không thể cập nhật ghim hội thoại. Vui lòng thử lại.');
    }
  };

  const handleMuteConversation = async (duration: '1h' | '4h' | '8h' | 'until_enabled') => {
    if (!selectedConversationId || !onMuteConversation) {
      return;
    }

    try {
      setGroupManageError(null);
      await onMuteConversation(selectedConversationId, duration);
      setIsMuteModalOpen(false);
    } catch {
      setGroupManageError('Không thể tắt thông báo. Vui lòng thử lại.');
    }
  };

  const handleUnmuteConversation = async () => {
    if (!selectedConversationId || !onUnmuteConversation) {
      return;
    }

    try {
      setGroupManageError(null);
      await onUnmuteConversation(selectedConversationId);
    } catch {
      setGroupManageError('Không thể bật lại thông báo. Vui lòng thử lại.');
    }
  };

  const handleCloseInfoPanel = () => {
    setIsInfoOpen(false);
    setIsArchiveOpen(false);
    setIsMembersViewOpen(false);
  };

  const handleToggleInfoPanel = () => {
    setIsInfoOpen((prev) => {
      const next = !prev;
      if (!next) {
        setIsArchiveOpen(false);
        setIsMembersViewOpen(false);
      }
      return next;
    });
  };

  const openArchiveView = (tab: 'media' | 'files' | 'links') => {
    setArchiveTab(tab);
    setIsMembersViewOpen(false);
    setIsArchiveOpen(true);
  };

  const openMembersView = () => {
    setIsArchiveOpen(false);
    setIsMembersViewOpen(true);
  };

  const groupMemberPreview = selectedConversation?.members ?? [];
  const groupAdminIds = selectedConversation?.adminIds ?? [];
  const existingMemberIds = groupMemberPreview.map((member) => member._id);
  const isGroupConversation = Boolean(selectedConversation?.isGroup);
  const isRemovedFromGroup = Boolean(isGroupConversation && selectedConversation?.removedFromGroup);
  const memberApprovalEnabled = Boolean(selectedConversation?.memberApprovalEnabled);
  const groupCreatorId = selectedConversation?.createdBy ?? selectedConversation?.adminIds?.[0];
  const isCurrentUserGroupAdmin = Boolean(
    isGroupConversation
      && chatPanelProps.currentUserId
      && groupAdminIds.includes(chatPanelProps.currentUserId),
  );
  const isCurrentUserGroupCreator = Boolean(
    isGroupConversation
      && chatPanelProps.currentUserId
      && groupCreatorId
      && chatPanelProps.currentUserId === groupCreatorId,
  );
  const canManageGroup = isCurrentUserGroupCreator || isCurrentUserGroupAdmin;
  const infoTitle = isGroupConversation ? 'Thông tin nhóm' : 'Thông tin hội thoại';
  const isConversationMuted = Boolean(conversationMutedUntil && new Date(conversationMutedUntil) > new Date());

  const allMessages = chatPanelProps.messages || [];
  const allMediaItems = allMessages.filter((m) => m.type === 'image' || m.type === 'video');
  const allFileItems = allMessages.filter((m) => String(m.type).startsWith('file/') || m.type === 'audio');
  const allLinkItems = allMessages.filter((m) => {
    const content = typeof m.content === 'string' ? m.content : '';
    return /(https?:\/\/|www\.)/i.test(content);
  });
  const mediaItems = allMediaItems.slice(0, 8);
  const fileItems = allFileItems.slice(0, 5);

  return (
    <>
      <input
        ref={groupAvatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleGroupAvatarFileChange(e);
        }}
      />

      <section className="flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border border-border bg-bg-card shadow-lg">
        <div className="h-full w-[300px] shrink-0 border-r border-border bg-bg-card hidden md:block">
          <ConversationList
            conversations={visibleConversations}
            selectedId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            searchTargets={visibleSearchTargets}
            onSelectSearchTarget={onSelectSearchTarget}
          />
        </div>

        <div className="h-full min-h-0 min-w-0 flex-1 overflow-hidden flex flex-col">
          <ChatPanel
            {...chatPanelProps}
            isGroupConversation={isGroupConversation}
            onLoadMore={onLoadMore}
            inputDisabled={isRemovedFromGroup}
            inputDisabledReason={isRemovedFromGroup ? 'Bạn đã bị xóa khỏi nhóm' : undefined}
            onInfoClick={handleToggleInfoPanel}
            onAvatarClick={handleOpenGroupAvatarPicker}
            onNameClick={() => {
              void handleChangeGroupName();
            }}
          />
        </div>

        {isInfoOpen && (
          <aside className="relative hidden h-full w-[320px] shrink-0 border-l border-border bg-bg-card xl:flex xl:flex-col shadow-inner">
            <div className="border-b border-border px-5 py-4">
              <h3 className="text-xl font-semibold text-text-primary">{isMembersViewOpen ? 'Thành viên' : isArchiveOpen ? 'Kho lưu trữ' : infoTitle}</h3>
            </div>

            <div className={`flex-1 overflow-y-auto px-5 py-5 ${(isArchiveOpen || isMembersViewOpen) ? 'hidden' : ''}`}>
              <div className="mb-6 flex flex-col items-center text-center">
                <button
                  type="button"
                  className={`mb-3 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-bg-hover text-lg font-bold text-accent border-2 border-accent/20 ${isGroupConversation ? 'cursor-pointer hover:border-accent transition-all' : 'cursor-default'}`}
                  onClick={isGroupConversation ? handleOpenGroupAvatarPicker : undefined}
                  disabled={!isGroupConversation || isUploadingGroupAvatar || isCreatingGroup}
                  title={isGroupConversation ? 'Đổi ảnh nhóm' : undefined}
                >
                  {selectedConversation?.avatarUrl ? (
                    <img src={selectedConversation.avatarUrl} alt={selectedConversation?.name ?? 'Nhóm'} className="h-full w-full object-cover" />
                  ) : (
                    <span>{selectedConversation?.avatar ?? 'N'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className={`text-xl font-semibold text-text-primary ${isGroupConversation ? 'cursor-pointer hover:text-accent transition-colors' : 'cursor-default'}`}
                  onClick={isGroupConversation ? () => { void handleChangeGroupName(); } : undefined}
                  disabled={!isGroupConversation || isCreatingGroup}
                  title={isGroupConversation ? 'Đổi tên nhóm' : undefined}
                >
                  {selectedConversation?.name ?? 'Hội thoại'}
                </button>
                <p className="text-sm text-text-secondary mt-1">
                  {selectedConversation?.isGroup
                    ? `${selectedConversation.memberCount ?? 0} thành viên`
                    : 'Hội thoại cá nhân'}
                </p>
              </div>

              <div className="mb-5 grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={isConversationMuted ? () => { void handleUnmuteConversation(); } : () => setIsMuteModalOpen(true)}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${isConversationMuted
                    ? 'border-accent-light bg-accent/10 text-accent'
                    : 'border-transparent bg-bg-hover text-text-primary hover:bg-bg-active'}`}
                >
                  {isConversationMuted ? 'Bật thông báo' : 'Tắt thông báo'}
                </button>
                <button
                  type="button"
                  onClick={() => { void handleTogglePinConversation(); }}
                  className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${isConversationPinned
                    ? 'border-accent-light bg-accent/10 text-accent'
                    : 'border-transparent bg-bg-hover text-text-primary hover:bg-bg-active'}`}
                >
                  {isConversationPinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
                </button>
                {isGroupConversation ? (
                  <>
                    <button
                      type="button"
                      onClick={openAddMembersModal}
                      className="rounded-xl bg-bg-hover px-2 py-2 text-xs font-medium text-text-primary border border-border hover:bg-bg-active transition"
                    >
                      Thêm thành viên
                    </button>
                    {canManageGroup ? (
                      <button
                        type="button"
                        onClick={() => setIsManageGroupOpen(true)}
                        className="col-span-3 rounded-xl bg-accent px-2 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition"
                      >
                        Quản lý nhóm
                      </button>
                    ) : (
                      <p className="col-span-3 rounded-xl bg-bg-hover px-3 py-2 text-xs text-text-secondary border border-border">
                        Bạn có thể đề xuất thêm thành viên. Khi bật duyệt, chỉ chủ nhóm mới có thể duyệt thêm thành viên.
                      </p>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={openCreateGroupModal}
                    className="col-span-1 rounded-xl bg-accent px-2 py-2 text-xs font-semibold text-white hover:bg-accent-hover transition"
                  >
                    Tạo nhóm
                  </button>
                )}
              </div>
                {!isGroupConversation && (
                  <>
                    <div className="mb-4 space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Ảnh/Video</p>
                      <div className="grid grid-cols-4 gap-2">
                        {mediaItems.length > 0 ? (
                          mediaItems.map((media) => (
                            <a
                              key={media._id}
                              href={media.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-12 overflow-hidden rounded-lg bg-bg-hover hover:opacity-80"
                            >
                              {media.type === 'image' ? (
                                <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-text-primary">▶</div>
                              )}
                            </a>
                          ))
                        ) : (
                          <p className="col-span-4 text-xs text-text-tertiary">Chưa có ảnh/video nào</p>
                        )}
                      </div>
                      <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">File</p>
                      {fileItems.length > 0 ? (
                        fileItems.map((file) => {
                          const fileName = getDisplayFileName(file);
                          return (
                            <a
                              key={file._id}
                              href={file.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-sm text-text-primary hover:text-accent hover:underline"
                            >
                              {fileName}
                            </a>
                          );
                        })
                      ) : (
                        <p className="text-xs text-text-tertiary">Chưa có file nào</p>
                      )}
                      <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                    </div>
                  </>
                )}

                {isGroupConversation && (
                  <>
                    <div className="mb-4 space-y-3 rounded-2xl border border-border bg-bg-card p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Duyệt thành viên</p>
                      <div className="flex items-center justify-between gap-3">
                        {isCurrentUserGroupCreator && (
                          <button
                            type="button"
                            disabled={isCreatingGroup}
                            onClick={handleToggleMemberApproval}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${memberApprovalEnabled
                              ? 'bg-accent text-text-primary hover:bg-accent-hover'
                              : 'bg-bg-hover text-text-primary hover:bg-accent'} disabled:opacity-60`}
                          >
                            {memberApprovalEnabled ? 'Tắt duyệt' : 'Bật duyệt'}
                          </button>
                        )}
                      </div>
                      {!isCurrentUserGroupCreator && (
                        <p className="text-xs text-text-tertiary">Chỉ chủ nhóm có thể bật/tắt duyệt thành viên.</p>
                      )}
                    </div>

                    <div className="mb-4 space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Thành viên nhóm</p>
                      <p className="text-sm text-text-primary">{selectedConversation?.memberCount ?? 0} thành viên</p>
                      <button
                        type="button"
                        onClick={openMembersView}
                        className="w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary"
                      >
                        Xem thành viên
                      </button>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Ảnh/Video</p>
                      <div className="grid grid-cols-4 gap-2">
                        {mediaItems.length > 0 ? (
                          mediaItems.map((media) => (
                            <a
                              key={media._id}
                              href={media.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-12 overflow-hidden rounded-lg bg-bg-hover hover:opacity-80"
                            >
                              {media.type === 'image' ? (
                                <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-text-primary">▶</div>
                              )}
                            </a>
                          ))
                        ) : (
                          <p className="col-span-4 text-xs text-text-tertiary">Chưa có ảnh/video nào</p>
                        )}
                      </div>
                      <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                    </div>
                    {/* File section for group */}
                    <div className="mt-4 space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">File</p>
                      {fileItems.length > 0 ? (
                        fileItems.map((file) => {
                          const fileName = getDisplayFileName(file);
                          return (
                            <a
                              key={file._id}
                              href={file.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-sm text-text-primary hover:text-accent hover:underline"
                            >
                              {fileName}
                            </a>
                          );
                        })
                      ) : (
                        <p className="text-xs text-text-tertiary">Chưa có file nào</p>
                      )}
                      <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { void handleLeaveGroup(); }}
                      className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/30"
                    >
                      Rời nhóm
                    </button>
                  </>
                )}
              </div>

              {isArchiveOpen && (
                <div className="absolute inset-0 z-10 flex flex-col bg-bg-card border-l border-border">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <button type="button" onClick={() => setIsArchiveOpen(false)} className="rounded-lg bg-bg-hover px-3 py-1.5 text-sm text-text-primary">Quay lại</button>
                    <h4 className="text-base font-semibold text-text-primary">Kho lưu trữ</h4>
                    <span className="w-16" />
                  </div>
                  <div className="flex gap-2 border-b border-border px-4 py-3 text-sm">
                    <button type="button" onClick={() => setArchiveTab('media')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'media' ? 'bg-accent text-text-primary' : 'bg-bg-hover text-text-primary'}`}>Ảnh/Video</button>
                    <button type="button" onClick={() => setArchiveTab('files')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'files' ? 'bg-accent text-text-primary' : 'bg-bg-hover text-text-primary'}`}>Files</button>
                    <button type="button" onClick={() => setArchiveTab('links')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'links' ? 'bg-accent text-text-primary' : 'bg-bg-hover text-text-primary'}`}>Links</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {archiveTab === 'media' && (
                      <div className="grid grid-cols-3 gap-3">
                        {allMediaItems.length === 0 && <p className="col-span-full text-sm text-text-tertiary">Chưa có ảnh/video nào.</p>}
                        {allMediaItems.map((media) => (
                          <a key={media._id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="block h-24 overflow-hidden rounded-lg bg-bg-hover">
                            {media.type === 'image' ? (
                              <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-text-primary">▶ Video</div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    {archiveTab === 'files' && (
                      <div className="space-y-2">
                        {allFileItems.length === 0 && <p className="text-sm text-text-tertiary">Chưa có file nào.</p>}
                        {allFileItems.map((file) => (
                          <a key={file._id} href={file.mediaUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-bg-hover px-3 py-2 text-sm text-text-primary hover:text-accent">
                            {getDisplayFileName(file)}
                          </a>
                        ))}
                      </div>
                    )}
                    {archiveTab === 'links' && (
                      <div className="space-y-2">
                        {allLinkItems.length === 0 && <p className="text-sm text-text-tertiary">Chưa có link nào.</p>}
                        {allLinkItems.map((msg) => {
                          const content = typeof msg.content === 'string' ? msg.content : '';
                          return (
                            <a key={msg._id} href={content.startsWith('http') ? content : `https://${content}`} target="_blank" rel="noreferrer" className="block rounded-lg bg-bg-hover px-3 py-2 text-sm text-accent-light hover:text-accent">
                              {content}
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isMembersViewOpen && (
                <div className="absolute inset-0 z-10 flex flex-col bg-bg-card border-l border-border">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <button type="button" onClick={() => setIsMembersViewOpen(false)} className="rounded-lg bg-bg-hover px-3 py-1.5 text-sm text-text-primary">Quay lại</button>
                    <h4 className="text-base font-semibold text-text-primary">Thành viên</h4>
                    <span className="w-16" />
                  </div>

                  <div className="border-b border-border px-4 py-3">
                    <button
                      type="button"
                      onClick={openAddMembersModal}
                      className="w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary"
                    >
                      + Thêm thành viên
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <p className="mb-3 text-sm font-semibold text-text-primary">Danh sách thành viên ({groupMemberPreview.length})</p>
                    <div className="space-y-2">
                      {groupMemberPreview.map((member) => {
                        const isCreator = groupCreatorId === member._id;
                        const isAdmin = groupAdminIds.includes(member._id);
                        const isMe = chatPanelProps.currentUserId === member._id;

                        return (
                          <div key={member._id} className="flex items-center justify-between rounded-xl bg-bg-hover px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-text-primary">{member.displayName} {isMe ? '(Bạn)' : ''}</p>
                              <p className="text-xs text-text-tertiary">
                                {isCreator ? 'Trưởng nhóm' : isAdmin ? 'Quản trị viên' : 'Thành viên'}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          )}
      </section>

      {isInfoOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 xl:hidden">
          <aside className="zync-glass-panel zync-glass-panel-strong relative ml-auto h-full w-[88%] max-w-sm overflow-y-auto border-l zync-glass-divider bg-bg-card border-l border-border p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-text-primary">{isMembersViewOpen ? 'Thành viên' : isArchiveOpen ? 'Kho lưu trữ' : infoTitle}</h3>
              <button
                type="button"
                className="rounded-full bg-bg-hover px-3 py-1 text-sm text-text-primary"
                onClick={handleCloseInfoPanel}
              >
                Đóng
              </button>
            </div>

            <div className={(isArchiveOpen || isMembersViewOpen) ? 'hidden' : ''}>
            <div className="mb-5 flex flex-col items-center text-center">
              <button
                type="button"
                className={`mb-3 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-bg-hover text-lg font-bold text-text-primary ${isGroupConversation ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={isGroupConversation ? handleOpenGroupAvatarPicker : undefined}
                disabled={!isGroupConversation || isUploadingGroupAvatar || isCreatingGroup}
                title={isGroupConversation ? 'Đổi ảnh nhóm' : undefined}
              >
                {selectedConversation?.avatarUrl ? (
                  <img src={selectedConversation.avatarUrl} alt={selectedConversation?.name ?? 'Nhóm'} className="h-full w-full object-cover" />
                ) : (
                  <span>{selectedConversation?.avatar ?? 'N'}</span>
                )}
              </button>
              <button
                type="button"
                className={`text-lg font-semibold text-text-primary ${isGroupConversation ? 'cursor-pointer hover:text-accent-light' : 'cursor-default'}`}
                onClick={isGroupConversation ? () => { void handleChangeGroupName(); } : undefined}
                disabled={!isGroupConversation || isCreatingGroup}
                title={isGroupConversation ? 'Đổi tên nhóm' : undefined}
              >
                {selectedConversation?.name ?? 'Hội thoại'}
              </button>
              <p className="text-sm text-text-tertiary">
                {selectedConversation?.isGroup
                  ? `${selectedConversation.memberCount ?? 0} thành viên`
                  : 'Hội thoại cá nhân'}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={isConversationMuted ? () => { void handleUnmuteConversation(); } : () => setIsMuteModalOpen(true)}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${isConversationMuted
                  ? 'border-yellow-500/35 bg-yellow-500/10 text-yellow-500'
                  : 'border-transparent bg-bg-hover text-text-primary'}`}
              >
                {isConversationMuted ? 'Bật thông báo' : 'Tắt thông báo'}
              </button>
              <button
                type="button"
                onClick={() => { void handleTogglePinConversation(); }}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${isConversationPinned
                  ? 'border-[#89f7d7]/35 bg-accent text-text-primary'
                  : 'border-transparent bg-bg-hover text-text-primary'}`}
              >
                {isConversationPinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
              </button>
              {isGroupConversation ? (
                <>
                  <button
                    type="button"
                    onClick={openAddMembersModal}
                    className="rounded-xl bg-bg-hover px-2 py-2 text-xs font-medium text-text-primary"
                  >
                    Thêm thành viên
                  </button>
                  {canManageGroup ? (
                    <button
                      type="button"
                      onClick={() => setIsManageGroupOpen(true)}
                      className="col-span-3 rounded-xl bg-accent px-2 py-2 text-xs font-semibold text-text-primary"
                    >
                      Quản lý nhóm
                    </button>
                  ) : (
                    <p className="col-span-3 rounded-xl bg-bg-hover px-3 py-2 text-xs text-text-secondary">
                      Bạn có thể đề xuất thêm thành viên. Khi bật duyệt, chỉ chủ nhóm mới có thể duyệt thêm thành viên.
                    </p>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={openCreateGroupModal}
                  className="rounded-xl bg-accent px-2 py-2 text-xs font-semibold text-text-primary"
                >
                  Tạo nhóm trò chuyện
                </button>
              )}
            </div>

            {!isGroupConversation && (
              <>
                <div className="mb-4 space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Ảnh/Video</p>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaItems.length > 0 ? (
                      mediaItems.map((media) => (
                        <a
                          key={media._id}
                          href={media.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-12 overflow-hidden rounded-lg bg-bg-hover hover:opacity-80"
                        >
                          {media.type === 'image' ? (
                            <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-text-primary">▶</div>
                          )}
                        </a>
                      ))
                    ) : (
                      <p className="col-span-4 text-xs text-text-tertiary">Chưa có ảnh/video nào</p>
                    )}
                  </div>
                  <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                </div>
                <div className="space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">File</p>
                  {fileItems.length > 0 ? (
                    fileItems.map((file) => {
                      const fileName = getDisplayFileName(file);
                      return (
                        <a
                          key={file._id}
                          href={file.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-text-primary hover:text-accent hover:underline"
                        >
                          {fileName}
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-xs text-text-tertiary">Chưa có file nào</p>
                  )}
                  <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                </div>
              </>
            )}

            {isGroupConversation && (
              <>
                <div className="mb-4 space-y-3 rounded-2xl border border-border bg-bg-card p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Duyệt thành viên</p>
                  <p className="text-sm text-text-primary">
                    Trạng thái: {memberApprovalEnabled ? 'ON - cần chủ nhóm duyệt' : 'OFF - thêm thẳng vào nhóm'}
                  </p>
                  {isCurrentUserGroupCreator ? (
                    <button
                      type="button"
                      disabled={isCreatingGroup}
                      onClick={handleToggleMemberApproval}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${memberApprovalEnabled
                        ? 'bg-accent text-text-primary'
                        : 'bg-bg-hover text-text-primary'} disabled:opacity-60`}
                    >
                      {memberApprovalEnabled ? 'Tắt duyệt' : 'Bật duyệt'}
                    </button>
                  ) : (
                    <p className="text-xs text-text-tertiary">Chỉ chủ nhóm có thể bật/tắt duyệt thành viên.</p>
                  )}
                </div>

                <div className="mb-4 space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Thành viên nhóm</p>
                  <p className="text-sm text-text-primary">{selectedConversation?.memberCount ?? 0} thành viên</p>
                  <button
                    type="button"
                    onClick={openMembersView}
                    className="w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary"
                  >
                    Xem thành viên
                  </button>
                </div>
                <div className="space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Ảnh/Video</p>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaItems.length > 0 ? (
                      mediaItems.map((media) => (
                        <a
                          key={media._id}
                          href={media.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-12 overflow-hidden rounded-lg bg-bg-hover hover:opacity-80"
                        >
                          {media.type === 'image' ? (
                            <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-text-primary">▶</div>
                          )}
                        </a>
                      ))
                    ) : (
                      <p className="col-span-4 text-xs text-text-tertiary">Chưa có ảnh/video nào</p>
                    )}
                  </div>
                  <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                </div>
                {/* File section for group (mobile view) */}
                <div className="mt-4 space-y-2 rounded-2xl border border-border bg-bg-card p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-text-secondary">File</p>
                  {fileItems.length > 0 ? (
                    fileItems.map((file) => {
                      const fileName = getDisplayFileName(file);
                      return (
                        <a
                          key={file._id}
                          href={file.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-text-primary hover:text-accent hover:underline"
                        >
                          {fileName}
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-xs text-text-tertiary">Chưa có file nào</p>
                  )}
                  <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary">Xem tất cả</button>
                </div>
                <button
                  type="button"
                  onClick={() => { void handleLeaveGroup(); }}
                  className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-500"
                >
                  Rời nhóm
                </button>
              </>
            )}
            </div>

            {isArchiveOpen && (
              <div className="absolute inset-0 z-10 flex flex-col bg-bg-card border-l border-border p-5">
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" onClick={() => setIsArchiveOpen(false)} className="rounded-lg bg-bg-hover px-3 py-1.5 text-sm text-text-primary">Quay lại</button>
                  <h4 className="text-base font-semibold text-text-primary">Kho lưu trữ</h4>
                  <span className="w-16" />
                </div>
                <div className="mb-3 flex gap-2 text-sm">
                  <button type="button" onClick={() => setArchiveTab('media')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'media' ? 'bg-accent text-text-primary' : 'bg-bg-hover text-text-primary'}`}>Ảnh/Video</button>
                  <button type="button" onClick={() => setArchiveTab('files')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'files' ? 'bg-accent text-text-primary' : 'bg-bg-hover text-text-primary'}`}>Files</button>
                  <button type="button" onClick={() => setArchiveTab('links')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'links' ? 'bg-accent text-text-primary' : 'bg-bg-hover text-text-primary'}`}>Links</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {archiveTab === 'media' && (
                    <div className="grid grid-cols-3 gap-3">
                      {allMediaItems.length === 0 && <p className="col-span-full text-sm text-text-tertiary">Chưa có ảnh/video nào.</p>}
                      {allMediaItems.map((media) => (
                        <a key={media._id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="block h-24 overflow-hidden rounded-lg bg-bg-hover">
                          {media.type === 'image' ? (
                            <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-text-primary">▶ Video</div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  {archiveTab === 'files' && (
                    <div className="space-y-2">
                      {allFileItems.length === 0 && <p className="text-sm text-text-tertiary">Chưa có file nào.</p>}
                      {allFileItems.map((file) => (
                        <a key={file._id} href={file.mediaUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-bg-hover px-3 py-2 text-sm text-text-primary hover:text-accent">
                          {getDisplayFileName(file)}
                        </a>
                      ))}
                    </div>
                  )}
                  {archiveTab === 'links' && (
                    <div className="space-y-2">
                      {allLinkItems.length === 0 && <p className="text-sm text-text-secondary">Chưa có link nào.</p>}
                      {allLinkItems.map((msg) => {
                        const content = typeof msg.content === 'string' ? msg.content : '';
                        return (
                          <a key={msg._id} href={content.startsWith('http') ? content : `https://${content}`} target="_blank" rel="noreferrer" className="block rounded-lg bg-bg-hover px-3 py-2 text-sm text-text-primary hover:text-accent">
                            {content}
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isMembersViewOpen && (
              <div className="absolute inset-0 z-10 flex flex-col bg-bg-primary p-5">
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" onClick={() => setIsMembersViewOpen(false)} className="rounded-lg bg-bg-hover px-3 py-1.5 text-sm text-text-primary border border-border">Quay lại</button>
                  <h4 className="text-base font-semibold text-text-primary">Thành viên</h4>
                  <span className="w-16" />
                </div>

                <button
                  type="button"
                  onClick={openAddMembersModal}
                  className="mb-4 w-full rounded-lg bg-bg-hover px-3 py-2 text-sm font-semibold text-text-primary"
                >
                  + Thêm thành viên
                </button>

                <div className="flex-1 overflow-y-auto">
                  <p className="mb-3 text-sm font-semibold text-text-secondary">Danh sách thành viên ({groupMemberPreview.length})</p>
                  <div className="space-y-2">
                    {groupMemberPreview.map((member) => {
                      const isCreator = groupCreatorId === member._id;
                      const isAdmin = groupAdminIds.includes(member._id);
                      const isMe = chatPanelProps.currentUserId === member._id;

                      return (
                        <div key={member._id} className="rounded-xl bg-bg-hover border border-border px-3 py-2">
                          <p className="truncate text-sm font-medium text-text-primary">{member.displayName} {isMe ? '(Bạn)' : ''}</p>
                          <p className="text-xs text-text-secondary">
                            {isCreator ? 'Trưởng nhóm' : isAdmin ? 'Quản trị viên' : 'Thành viên'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {isRenameGroupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-text-primary">Đổi tên nhóm</h4>
            <input
              value={renameGroupDraft}
              onChange={(e) => setRenameGroupDraft(e.target.value)}
              className="mt-4 w-full rounded-xl border border-border bg-bg-hover px-4 py-2.5 text-sm text-text-primary outline-none focus:border-accent"
              placeholder="Nhập tên nhóm mới"
              maxLength={100}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setIsRenameGroupOpen(false)} className="rounded-lg bg-bg-hover px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-active">Hủy</button>
              <button type="button" onClick={() => { void handleSubmitGroupNameChange(); }} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {isMuteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-text-primary mb-4">Tắt thông báo</h4>
            <div className="space-y-2">
              <button type="button" onClick={() => { void handleMuteConversation('1h'); }} className="w-full rounded-xl bg-bg-hover px-4 py-3 text-left text-sm text-text-primary hover:bg-bg-active border border-border transition">Trong 1 giờ</button>
              <button type="button" onClick={() => { void handleMuteConversation('4h'); }} className="w-full rounded-xl bg-bg-hover px-4 py-3 text-left text-sm text-text-primary hover:bg-bg-active border border-border transition">Trong 4 giờ</button>
              <button type="button" onClick={() => { void handleMuteConversation('8h'); }} className="w-full rounded-xl bg-bg-hover px-4 py-3 text-left text-sm text-text-primary hover:bg-bg-active border border-border transition">Trong 8 giờ</button>
              <button type="button" onClick={() => { void handleMuteConversation('until_enabled'); }} className="w-full rounded-xl bg-bg-hover px-4 py-3 text-left text-sm text-text-primary hover:bg-bg-active border border-border transition">Cho đến khi tôi bật lại</button>
            </div>
            <button type="button" onClick={() => setIsMuteModalOpen(false)} className="mt-6 w-full rounded-lg bg-bg-hover px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-active border border-border">Đóng</button>
          </div>
        </div>
      )}

      {isLeaveGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-text-primary">Rời nhóm</h4>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">Bạn có chắc muốn rời nhóm này? Bạn sẽ không còn nhận được tin nhắn từ nhóm này nữa.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLeaveGroupModalOpen(false)}
                className="rounded-lg bg-bg-hover px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-active border border-border"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmLeaveGroup(); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Rời nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {isRemoveMemberConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-text-primary">Xóa thành viên</h4>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">Bạn có chắc muốn xóa thành viên này khỏi nhóm?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRemoveMemberConfirmOpen(false);
                  setRemoveMemberTargetId(null);
                }}
                className="rounded-lg bg-bg-hover px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-active border border-border"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmRemoveMember(); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {isDisbandConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-text-primary">Giải tán nhóm</h4>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">Giải tán nhóm sẽ xóa toàn bộ nhóm. Bạn có chắc muốn tiếp tục?</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDisbandConfirmOpen(false)}
                className="rounded-lg bg-bg-hover px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-active border border-border"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmDisbandGroup(); }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition"
              >
                Giải tán
              </button>
            </div>
          </div>
        </div>
      )}

      {groupManageError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-6 shadow-2xl">
            <h4 className="text-lg font-semibold text-red-500">Thông báo</h4>
            <p className="mt-2 text-sm text-text-secondary leading-relaxed">{groupManageError}</p>
            <button
              type="button"
              onClick={() => setGroupManageError(null)}
              className="mt-6 w-full rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-500/20 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {groupManageSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-bg-card p-5">
            <h4 className="text-lg font-semibold text-text-primary">Thành công</h4>
            <p className="mt-2 text-sm text-text-primary">{groupManageSuccess}</p>
            <button
              type="button"
              onClick={() => setGroupManageSuccess(null)}
              className="mt-4 w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-text-primary"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <ManageGroupModal
        open={isManageGroupOpen}
        members={groupMemberPreview}
        adminIds={groupAdminIds}
        creatorId={groupCreatorId}
        isSubmitting={isCreatingGroup}
        groupName={selectedConversation?.name ?? 'Nhóm'}
        onClose={() => setIsManageGroupOpen(false)}
        onAssignRole={handleAssignMemberRole}
        onRemoveMember={handleRemoveMember}
        onDisbandGroup={handleDisbandGroup}
      />

      <CreateGroupModal
        open={isCreateGroupOpen}
        friends={friends}
        selectedFriendIds={selectedFriendIds}
        groupName={groupName}
        query={groupQuery}
        isCreatingGroup={isCreatingGroup}
        onClose={() => setIsCreateGroupOpen(false)}
        onChangeGroupName={setGroupName}
        onChangeQuery={setGroupQuery}
        onToggleFriend={toggleFriendSelection}
        onSubmit={handleCreateGroup}
      />

      <AddMembersModal
        open={isAddMembersOpen}
        friends={friends}
        existingMemberIds={existingMemberIds}
        selectedMemberIds={selectedAddMemberIds}
        query={memberSearchQuery}
        isSubmitting={isCreatingGroup}
        onClose={() => setIsAddMembersOpen(false)}
        onChangeQuery={setMemberSearchQuery}
        onToggleMember={toggleAddMemberSelection}
        onSubmit={handleConfirmAddMembers}
      />
    </>
  );
}
