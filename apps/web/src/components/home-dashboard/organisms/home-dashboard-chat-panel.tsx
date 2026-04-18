'use client';

import { type ChangeEvent, type RefObject, useCallback, useEffect, useRef, useState } from 'react';
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
}

type CallUiStatus = 'idle' | 'outgoing' | 'incoming' | 'connecting' | 'connected' | 'ended' | 'missed' | 'rejected';

// ==================== ICONS ====================

function PhoneIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 3a2.5 2.5 0 0 1 2.5-2.5h2.69a2.5 2.5 0 0 1 2.5 2.5v3.69a2.5 2.5 0 0 1-2.5 2.5H5a13 13 0 0 0 13 13v-3.81a2.5 2.5 0 0 1 2.5-2.5h3.69a2.5 2.5 0 0 1 2.5 2.5V21a2.5 2.5 0 0 1-2.5 2.5h-6.5A18 18 0 0 1 3.5 3Z" /></svg>;
}

function VideoIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x={1} y={5} width={15} height={14} rx={2} ry={2} /></svg>;
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
  callError?: string | null;
  isCallingAvailable?: boolean;
  isMicMuted?: boolean;
  isCameraEnabled?: boolean;
  isScreenSharing?: boolean;
  localVideoRef?: RefObject<HTMLVideoElement>;
  remoteVideoRef?: RefObject<HTMLVideoElement>;
  onStartVideoCall?: () => void;
  onAcceptIncomingCall?: () => void;
  onRejectIncomingCall?: () => void;
  onEndCall?: () => void;
  onToggleMic?: () => void;
  onToggleCamera?: () => void;
  onToggleScreenShare?: () => void;
  isLoading?: boolean;
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
    <aside className="zync-glass-panel zync-glass-panel-strong h-full min-h-0 overflow-y-auto border-r zync-glass-divider p-4">
      <h2 className="text-2xl font-bold text-[#e6fff5] mb-4">Tin nhắn</h2>

      {/* Search */}
      <label className="zync-glass-subtle mb-4 flex h-11 items-center gap-2 rounded-xl bg-[#12392f]/48 px-3 text-[#b5ddd0]">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm cuộc hội thoại"
          className="w-full bg-transparent text-sm text-[#d8f7ec] outline-none placeholder:text-[#90b8a9]"
        />
      </label>

      {/* Search Results */}
      {normalizedQuery && (
        <div className="mb-4 space-y-2 rounded-2xl border border-[#1f5e4b] bg-[#0a3128] p-2">
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-[#8cc4b0]">Kết quả tìm kiếm</p>
          {filteredSearchTargets.length === 0 ? (
            <p className="px-2 py-2 text-sm text-[#99c2b3]">Không có bạn bè hoặc nhóm phù hợp.</p>
          ) : (
            filteredSearchTargets.map((target) => (
              <button
                key={`${target.type}-${target.id}`}
                type="button"
                onClick={() => {
                  onSelectSearchTarget(target);
                  setQuery('');
                }}
                className="flex w-full items-center justify-between rounded-xl bg-[#0f3a2f] px-3 py-2 text-left hover:bg-[#145141]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#e6fff5]">{target.name}</p>
                  <p className="text-xs text-[#8cc4b0]">{target.type === 'group' ? 'Nhóm' : 'Bạn bè'}</p>
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#235646] text-xs font-semibold text-[#d8fbed]">
                  {(target.avatar || target.name).substring(0, 2).toUpperCase()}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Conversations */}
      {filteredConversations.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-[#99c2b3] text-center">
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
                  ? 'zync-glass-subtle border-[#9bffe0]/44 bg-[#113f32]/66'
                  : 'border-transparent hover:border-[#8bf8d0]/22 hover:bg-[#0b3027]/62'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full bg-[#2f6657] text-[#dffef1] flex-shrink-0">
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {item.avatar}
                  </span>
                  {item.online && (
                    <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#3aefbf]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-base font-semibold text-[#e6fff6]">{item.name}</p>
                    <div className="flex items-center gap-2">
                      {isMuted && (
                        <span className="inline-flex items-center text-[#ffd8a8]" aria-label="Đã tắt thông báo" title="Đã tắt thông báo">
                          <BellOffMiniIcon />
                        </span>
                      )}
                      <p className="text-xs uppercase tracking-wide text-[#9ac7b7] whitespace-nowrap">{item.time}</p>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-[#9fc6b8]">{item.preview}</p>
                    {item.isPinned && (
                      <span className="inline-flex items-center text-[#b5f8e2]" aria-label="Đã ghim" title="Đã ghim">
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
  callError = null,
  isCallingAvailable = false,
  isMicMuted = false,
  isCameraEnabled = true,
  isScreenSharing = false,
  localVideoRef,
  remoteVideoRef,
  onStartVideoCall = () => {},
  onAcceptIncomingCall = () => {},
  onRejectIncomingCall = () => {},
  onEndCall = () => {},
  onToggleMic = () => {},
  onToggleCamera = () => {},
  onToggleScreenShare = () => {},
  userPenaltyScore = 0,
  userMutedUntil = null,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

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
  const callStatusLabel: Record<Exclude<CallUiStatus, 'idle'>, string> = {
    outgoing: 'Dang do chuong...',
    incoming: 'Cuoc goi den',
    connecting: 'Dang ket noi...',
    connected: 'Dang trong cuoc goi',
    ended: 'Da ket thuc',
    missed: 'Nho cuoc goi',
    rejected: 'Da tu choi',
  };
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

  return (
    <article className="zync-glass-panel zync-glass-panel-strong grid h-full w-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto_auto] overflow-hidden bg-[radial-gradient(circle_at_12%_18%,rgba(170,255,228,0.12),transparent_38%),linear-gradient(180deg,#031d17_0%,#02140f_100%)]">
      {/* Header */}
      <header className="zync-glass-subtle flex items-center justify-between border-b zync-glass-divider px-5 py-3 bg-[#06271f]/42">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className={`relative h-11 w-11 overflow-hidden rounded-full bg-[#376f5f] ${isGroupConversation ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={isGroupConversation ? onAvatarClick : undefined}
            title={isGroupConversation ? 'Đổi ảnh nhóm' : undefined}
          >
            {participantAvatarUrl ? (
              <img src={participantAvatarUrl} alt={participantName} className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#e6fff5]">
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
              className={`text-left text-base font-semibold text-[#e4fff4] ${isGroupConversation ? 'cursor-pointer hover:text-[#bff8e6]' : 'cursor-default'}`}
              onClick={isGroupConversation ? onNameClick : undefined}
              title={isGroupConversation ? 'Đổi tên nhóm' : undefined}
            >
              {participantName}
            </button>
            <p className="text-xs text-[#53e1b5]">
              {isOnline ? 'đang hoạt động' : 'ngoại tuyến'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#a8d8c7]">
          <button
            type="button"
            className="zync-glass-subtle inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a]/62 transition-colors hover:bg-[#16473a]/72 disabled:cursor-not-allowed disabled:opacity-45"
            title="Call"
            disabled={!isCallingAvailable || isGroupConversation}
            onClick={onStartVideoCall}
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="zync-glass-subtle inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a]/62 transition-colors hover:bg-[#16473a]/72 disabled:cursor-not-allowed disabled:opacity-45"
            title="Video call"
            disabled={!isCallingAvailable || isGroupConversation}
            onClick={onStartVideoCall}
          >
            <VideoIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="zync-glass-subtle inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a]/62 transition-colors hover:bg-[#16473a]/72"
            title="Info"
            onClick={onInfoClick}
          >
            <InfoIcon className="w-5 h-5" />
          </button>
        </div>
      </header>
      
      {/* Report Notification Toast */}
      {reportStatus && (
        <div className="bg-[#0d3a2e] border-b border-[#2a6057] px-5 py-2 text-sm text-[#aefcd6] flex items-center justify-between">
          <span>{reportStatus}</span>
          <button onClick={() => setReportStatus(null)} className="text-[#6bbda0] hover:text-white">✕</button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-700 px-6 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {inputDisabled && (
        <div className="border-b border-[#8a3f3f] bg-[#4a2222] px-6 py-2 text-sm text-[#ffd9d9]">
          {inputDisabledReason ?? 'Bạn không thể nhắn tin trong hội thoại này.'}
        </div>
      )}

      {isCallVisible && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#010d0ad4] px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-[#2f6b58] bg-[linear-gradient(180deg,#04241c_0%,#031912_100%)] text-[#d9fff1] shadow-[0_28px_80px_rgba(0,0,0,0.55)]">
            <div className="border-b border-[#245b4b] px-5 py-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#dffef2]">
                    {callStatusLabel[callStatus]}
                  </p>
                  <p className="text-xs text-[#8cc4b0]">
                    {callPeerName ? `Nguoi tham gia: ${callPeerName}` : 'Dang dong bo thong tin cuoc goi'}
                  </p>
                  {callError && <p className="mt-1 text-xs text-[#ff9f9f]">{callError}</p>}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {callStatus === 'incoming' && (
                    <>
                      <button
                        type="button"
                        onClick={onAcceptIncomingCall}
                        className="rounded-lg bg-[#1d7f62] px-3 py-1.5 text-xs font-semibold text-[#e8fff7] hover:bg-[#249875]"
                      >
                        Nhan
                      </button>
                      <button
                        type="button"
                        onClick={onRejectIncomingCall}
                        className="rounded-lg bg-[#7f2f2f] px-3 py-1.5 text-xs font-semibold text-[#ffe6e6] hover:bg-[#9a3a3a]"
                      >
                        Tu choi
                      </button>
                    </>
                  )}

                  {callStatus === 'connected' && (
                    <>
                      <button
                        type="button"
                        onClick={onToggleMic}
                        className="rounded-lg bg-[#114539] px-3 py-1.5 text-xs font-semibold text-[#d9fff1] hover:bg-[#165848]"
                      >
                        {isMicMuted ? 'Bat mic' : 'Tat mic'}
                      </button>
                      <button
                        type="button"
                        onClick={onToggleCamera}
                        className="rounded-lg bg-[#114539] px-3 py-1.5 text-xs font-semibold text-[#d9fff1] hover:bg-[#165848]"
                      >
                        {isCameraEnabled ? 'Tat camera' : 'Bat camera'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          void onToggleScreenShare();
                        }}
                        className="rounded-lg bg-[#114539] px-3 py-1.5 text-xs font-semibold text-[#d9fff1] hover:bg-[#165848]"
                      >
                        {isScreenSharing ? 'Dung chia se' : 'Chia se man hinh'}
                      </button>
                    </>
                  )}

                  {callStatus !== 'ended' && callStatus !== 'missed' && callStatus !== 'rejected' && (
                    <button
                      type="button"
                      onClick={onEndCall}
                      className="rounded-lg bg-[#8a2f2f] px-3 py-1.5 text-xs font-semibold text-[#ffe4e4] hover:bg-[#a53d3d]"
                    >
                      Ket thuc
                    </button>
                  )}
                </div>
              </div>
            </div>

            {(callStatus === 'outgoing' || callStatus === 'connecting' || callStatus === 'connected' || callStatus === 'incoming') && (
              <div className="grid gap-3 p-4 sm:grid-cols-[240px_minmax(0,1fr)]">
                <div className="overflow-hidden rounded-xl border border-[#235747] bg-[#031b15]">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="h-44 w-full object-cover"
                  />
                  <p className="border-t border-[#1a4a3b] px-2 py-1 text-[11px] text-[#8cc4b0]">Preview camera</p>
                </div>

                <div className="relative overflow-hidden rounded-xl border border-[#235747] bg-[#041f18]">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="h-44 w-full object-cover sm:h-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto px-5 py-4 space-y-2"
      >
        {/* Load More Button */}
        {messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="zync-glass-subtle rounded-lg bg-[#103a30]/62 px-4 py-2 text-sm text-[#cdebe1] transition-colors hover:bg-[#0b3027]/72 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#99c2b3]">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {isRemovedFromGroup && !hasRemovedNoticeInMessages && (
              <div className="my-3 flex flex-col items-center gap-1.5">
              </div>
            )}

            {messages.map((message) => (
              <MessageItem
                key={message._id}
                message={message}
                isSender={String(message.senderId) === String(currentUserId)}
                canRecall={canRecallMessage(message.createdAt)}
                senderAvatar={participantAvatar}
                messageStatus={messageStatus}
                onDeleteForMe={onDeleteMessageForMe}
                onRecall={onRecallMessage}
                onForward={onForwardMessage}
                reactionUserState={reactionUserStateByMessage[message._id] || message.reactionUserState}
                onReactionUpsert={onReactionUpsert}
                onReactionRemoveAllMine={onReactionRemoveAllMine}
                onFetchReactionDetails={onFetchReactionDetails}
                onReport={handleReportMessage}
                onReact={handleReactMessage}
              />
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
      <div className="zync-glass-subtle border-t zync-glass-divider bg-[#12392f]/45 px-4 py-1.5">
        <div className="mb-1 flex items-center justify-between text-[11px] text-[#8cc4b0]">
          <span>Mức độ vi phạm tiêu chuẩn cộng đồng</span>
          <span className={userPenaltyScore >= 80 ? 'font-semibold text-red-400' : ''}>
            {userPenaltyScore}%
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-[#06271f]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              userPenaltyScore >= 80 ? 'bg-red-500' :
              userPenaltyScore >= 50 ? 'bg-orange-500' :
              userPenaltyScore > 0 ? 'bg-yellow-500' : 'bg-[#2f6657]'
            }`}
            style={{ width: `${Math.min(Math.max(userPenaltyScore, 0), 100)}%` }}
          />
        </div>
        {userMutedUntil && new Date(userMutedUntil) > new Date() && (
          <p className="mt-1 text-[11px] font-medium text-red-400">
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
      <div className="w-full max-w-4xl rounded-2xl border border-[#1a5c4a] bg-[linear-gradient(180deg,#083328_0%,#05231c_100%)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a5c4a] px-6 py-4">
          <h3 className="text-2xl font-semibold text-[#dffef2]">Tạo nhóm</h3>
          <button
            type="button"
            className="rounded-full bg-[#0f4335] px-3 py-1.5 text-sm text-[#9ed0be] hover:bg-[#145845]"
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
            className="mb-3 h-11 w-full rounded-xl border border-[#1d5b4a] bg-[#0b3b2f] px-4 text-sm text-[#d7f6eb] outline-none placeholder:text-[#7eb5a2] focus:border-[#2de3b3]"
          />

          <input
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Nhập tên bạn để tìm"
            className="h-11 w-full rounded-xl border border-[#1d5b4a] bg-[#0b3b2f] px-4 text-sm text-[#d7f6eb] outline-none placeholder:text-[#7eb5a2] focus:border-[#2de3b3]"
          />

          <p className="mt-3 text-sm text-[#8cc4b0]">
            Đã chọn {selectedFriendIds.length}/100 bạn. Cần tối thiểu 2 bạn để tạo nhóm.
          </p>
        </div>

        <div className="grid gap-4 border-t border-[#1a5c4a] px-6 py-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[#1a5c4a] bg-[#072d24] p-3">
            <p className="mb-3 text-sm font-semibold text-[#d8fbed]">Bạn bè của tôi</p>
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
                        ? 'border-[#2de3b3] bg-[#0f4335]'
                        : 'border-[#175443] hover:border-[#22705b] hover:bg-[#0b3a2f]'
                    }`}
                  >
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                      isSelected ? 'border-[#2de3b3] bg-[#2de3b3] text-[#073428]' : 'border-[#5b9785] text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#235646] text-sm font-semibold text-[#d8fbed]">
                      {friend.displayName.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-medium text-[#d6f8ec]">{friend.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[#1a5c4a] bg-[#072d24] p-3">
            <p className="mb-3 text-sm font-semibold text-[#d8fbed]">Đã chọn</p>
            {selectedFriends.length === 0 ? (
              <p className="text-sm text-[#7ab09e]">Chưa có thành viên nào được chọn.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => onToggleFriend(friend.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0f4335] px-3 py-1 text-sm text-[#a6e3cf]"
                  >
                    <span>{friend.displayName}</span>
                    <span>x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#1a5c4a] px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-[#0f4335] px-6 py-2 font-semibold text-[#a6e3cf] hover:bg-[#145845]"
            onClick={onClose}
            disabled={isCreatingGroup}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#1e6f59] px-6 py-2 font-semibold text-[#e6fff5] transition enabled:bg-[#2ab98f] enabled:hover:bg-[#22a17d] disabled:cursor-not-allowed disabled:opacity-60"
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
      <div className="w-full max-w-2xl rounded-2xl border border-[#1a5c4a] bg-[linear-gradient(180deg,#083328_0%,#05231c_100%)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a5c4a] px-6 py-4">
          <h3 className="text-2xl font-semibold text-[#dffef2]">Thêm thành viên</h3>
          <button
            type="button"
            className="rounded-full bg-[#0f4335] px-3 py-1.5 text-sm text-[#9ed0be] hover:bg-[#145845]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#1d5b4a] bg-[#0b3b2f] px-3 text-[#7eb5a2]">
            <SearchIcon />
            <input
              type="text"
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Nhập tên hiển thị hoặc @username"
              className="w-full bg-transparent text-sm text-[#d7f6eb] outline-none placeholder:text-[#7eb5a2]"
            />
          </label>
        </div>

        <div className="max-h-[420px] overflow-y-auto border-t border-[#1a5c4a] px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-[#d8fbed]">Trò chuyện gần đây</p>
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
                      ? 'cursor-not-allowed border-[#2c6858] bg-[#0d3a2f] opacity-70'
                      : isSelected
                        ? 'border-[#2de3b3] bg-[#0f4335]'
                        : 'border-[#175443] hover:border-[#22705b] hover:bg-[#0b3a2f]'
                  }`}
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                    isExisting || isSelected
                      ? 'border-[#2de3b3] bg-[#2de3b3] text-[#073428]'
                      : 'border-[#5b9785] text-transparent'
                  }`}>
                    ✓
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#235646] text-sm font-semibold text-[#d8fbed]">
                    {friend.displayName.substring(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#d6f8ec]">{friend.displayName}</p>
                    {isExisting && <p className="text-xs text-[#8cc4b0]">Đã tham gia</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#1a5c4a] px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-[#0f4335] px-6 py-2 font-semibold text-[#a6e3cf] hover:bg-[#145845]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#1e6f59] px-6 py-2 font-semibold text-[#e6fff5] transition enabled:bg-[#2ab98f] enabled:hover:bg-[#22a17d] disabled:cursor-not-allowed disabled:opacity-60"
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
    return <p className="text-sm text-[#7ab09e]">Nhóm chưa có thành viên.</p>;
  }

  const adminSet = new Set(adminIds);

  return (
    <div className="space-y-2">
      {members.map((member) => {
        const isCreator = creatorId === member._id;
        const isAdmin = adminSet.has(member._id);

        return (
          <div key={member._id} className="flex items-center justify-between gap-3 rounded-xl bg-[#0d3a2f] px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#d6f8ec]">{member.displayName}</p>
              <p className="text-xs text-[#8cc4b0]">
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
      <div className="w-full max-w-3xl rounded-2xl border border-[#1a5c4a] bg-[linear-gradient(180deg,#083328_0%,#05231c_100%)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a5c4a] px-6 py-4">
          <h3 className="text-2xl font-semibold text-[#dffef2]">Quản lý nhóm</h3>
          <button
            type="button"
            className="rounded-full bg-[#0f4335] px-3 py-1.5 text-sm text-[#9ed0be] hover:bg-[#145845]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </button>
        </div>

        <div className="max-h-[430px] overflow-y-auto px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-[#d8fbed]">Thành viên nhóm</p>
          <div className="space-y-2">
            {members.map((member) => {
              const isCreator = creatorId === member._id;
              const isAdmin = adminSet.has(member._id);

              return (
                <div
                  key={member._id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#175443] bg-[#072d24] px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[#d6f8ec]">{member.displayName}</p>
                    <p className="text-xs text-[#8cc4b0]">
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
                          className="rounded-lg bg-[#0f4335] px-3 py-1 text-xs font-semibold text-[#a6e3cf] hover:bg-[#145845] disabled:opacity-60"
                        >
                          Gỡ quyền
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => onAssignRole(member._id, 'admin')}
                          className="rounded-lg bg-[#1e6f59] px-3 py-1 text-xs font-semibold text-[#e6fff5] hover:bg-[#22a17d] disabled:opacity-60"
                        >
                          Gán quyền
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => onRemoveMember(member._id)}
                        className="rounded-lg bg-[#6e2a2a] px-3 py-1 text-xs font-semibold text-[#ffdcdc] hover:bg-[#8b3535] disabled:opacity-60"
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

        <div className="flex items-center justify-between gap-3 border-t border-[#1a5c4a] px-6 py-4">
          <p className="text-xs text-[#8cc4b0]">Nhóm: {groupName}</p>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onDisbandGroup}
            className="rounded-lg bg-[#822d2d] px-4 py-2 text-sm font-semibold text-[#ffe3e3] hover:bg-[#9a3838] disabled:opacity-60"
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

  useEffect(() => {
    if (!groupManageSuccess) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setGroupManageSuccess(null);
    }, 3000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [groupManageSuccess]);

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

    const confirmed = globalThis.confirm('Bạn có chắc muốn xóa thành viên này khỏi nhóm?');
    if (!confirmed) {
      return;
    }

    try {
      setGroupManageError(null);
      await onRemoveGroupMember(selectedConversationId, memberId);
    } catch {
      setGroupManageError('Không thể xóa thành viên. Vui lòng thử lại.');
    }
  };

  const handleDisbandGroup = async () => {
    if (!onDisbandGroup || !selectedConversationId) {
      return;
    }

    const confirmed = globalThis.confirm('Giải tán nhóm sẽ xóa toàn bộ nhóm. Bạn có chắc muốn tiếp tục?');
    if (!confirmed) {
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

      <section className="zync-glass-panel zync-glass-floating flex h-full w-full min-h-0 min-w-0 flex-1 overflow-hidden rounded-3xl border zync-glass-divider bg-[#031c16]/62">
        <div className="h-full w-[300px] shrink-0 border-r zync-glass-divider">
          <ConversationList
            conversations={visibleConversations}
            selectedId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            searchTargets={visibleSearchTargets}
            onSelectSearchTarget={onSelectSearchTarget}
          />
        </div>

        <div className="h-full min-w-0 flex-1">
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
            <aside className="zync-glass-panel zync-glass-panel-strong relative hidden h-full w-[320px] shrink-0 border-l zync-glass-divider bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)] xl:flex xl:flex-col">
              <div className="border-b zync-glass-divider px-5 py-4">
                <h3 className="text-xl font-semibold text-[#e2fff4]">{isMembersViewOpen ? 'Thành viên' : isArchiveOpen ? 'Kho lưu trữ' : infoTitle}</h3>
              </div>

              <div className={`flex-1 overflow-y-auto px-5 py-5 ${(isArchiveOpen || isMembersViewOpen) ? 'hidden' : ''}`}>
                <div className="mb-6 flex flex-col items-center text-center">
                  <button
                    type="button"
                    className={`mb-3 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#245948] text-lg font-bold text-[#d6fbee] ${isGroupConversation ? 'cursor-pointer' : 'cursor-default'}`}
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
                    className={`text-xl font-semibold text-[#e2fff4] ${isGroupConversation ? 'cursor-pointer hover:text-[#bff8e6]' : 'cursor-default'}`}
                    onClick={isGroupConversation ? () => { void handleChangeGroupName(); } : undefined}
                    disabled={!isGroupConversation || isCreatingGroup}
                    title={isGroupConversation ? 'Đổi tên nhóm' : undefined}
                  >
                    {selectedConversation?.name ?? 'Hội thoại'}
                  </button>
                  <p className="text-sm text-[#8abfab]">
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
                      ? 'border-[#ffcf99]/35 bg-[#4a3417] text-[#ffe2bd]'
                      : 'border-transparent bg-[#0d3b2f] text-[#c7f4e6]'}`}
                  >
                    {isConversationMuted ? 'Bật thông báo' : 'Tắt thông báo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { void handleTogglePinConversation(); }}
                    className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${isConversationPinned
                      ? 'border-[#89f7d7]/35 bg-[#165542] text-[#d6fff0]'
                      : 'border-transparent bg-[#0d3b2f] text-[#c7f4e6]'}`}
                  >
                    {isConversationPinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
                  </button>
                  {isGroupConversation ? (
                    <>
                      <button
                        type="button"
                        onClick={openAddMembersModal}
                        className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]"
                      >
                        Thêm thành viên
                      </button>
                      {canManageGroup ? (
                        <button
                          type="button"
                          onClick={() => setIsManageGroupOpen(true)}
                          className="col-span-3 rounded-xl bg-[#1f7a60] px-2 py-2 text-xs font-semibold text-[#e6fff5] hover:bg-[#1a664f]"
                        >
                          Quản lý nhóm
                        </button>
                      ) : (
                        <p className="col-span-3 rounded-xl bg-[#0d3b2f] px-3 py-2 text-xs text-[#9bcbb9]">
                          Bạn có thể đề xuất thêm thành viên. Khi bật duyệt, chỉ chủ nhóm mới có thể duyệt thêm thành viên.
                        </p>
                      )}
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={openCreateGroupModal}
                      className="rounded-xl bg-[#1f7a60] px-2 py-2 text-xs font-semibold text-[#e6fff5] hover:bg-[#1a664f]"
                    >
                      Tạo nhóm trò chuyện
                    </button>
                  )}
                </div>

                {(isConversationMuted || isConversationPinned) && (
                  <p className="mb-5 rounded-xl border border-[#1f5e4b] bg-[#0a3128] px-3 py-2 text-xs text-[#bfead9]">
                    {isConversationPinned ? 'Đã ghim hội thoại. ' : ''}
                    {isConversationMuted ? 'Đang tắt thông báo cho hội thoại này.' : ''}
                  </p>
                )}

                {!isGroupConversation && (
                  <>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Nhắc hẹn</p>
                      <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                      <p className="text-sm text-[#d6f8ec]">22 nhóm chung</p>
                    </div>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                      <div className="grid grid-cols-4 gap-2">
                        {mediaItems.length > 0 ? (
                          mediaItems.map((media) => (
                            <a
                              key={media._id}
                              href={media.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-12 overflow-hidden rounded-lg bg-[#0d3b2f] hover:opacity-80"
                            >
                              {media.type === 'image' ? (
                                <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-[#d6f8ec]">▶</div>
                              )}
                            </a>
                          ))
                        ) : (
                          <p className="col-span-4 text-xs text-[#8abfab]">Chưa có ảnh/video nào</p>
                        )}
                      </div>
                      <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">File</p>
                      {fileItems.length > 0 ? (
                        fileItems.map((file) => {
                          const fileName = typeof file.content === 'string' && file.content.length > 0 ? file.content : 'Tệp đính kèm';
                          return (
                            <a
                              key={file._id}
                              href={file.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-sm text-[#d6f8ec] hover:text-[#46e6b8] hover:underline"
                            >
                              {fileName}
                            </a>
                          );
                        })
                      ) : (
                        <p className="text-xs text-[#8abfab]">Chưa có file nào</p>
                      )}
                      <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                    </div>
                  </>
                )}

                {isGroupConversation && (
                  <>
                    <div className="mb-4 space-y-3 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Duyệt thành viên</p>
                      <div className="flex items-center justify-between gap-3">
                        {isCurrentUserGroupCreator && (
                          <button
                            type="button"
                            disabled={isCreatingGroup}
                            onClick={handleToggleMemberApproval}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${memberApprovalEnabled
                              ? 'bg-[#1f7a60] text-[#e6fff5] hover:bg-[#1a664f]'
                              : 'bg-[#0f4335] text-[#a6e3cf] hover:bg-[#145845]'} disabled:opacity-60`}
                          >
                            {memberApprovalEnabled ? 'Tắt duyệt' : 'Bật duyệt'}
                          </button>
                        )}
                      </div>
                      {!isCurrentUserGroupCreator && (
                        <p className="text-xs text-[#8cc4b0]">Chỉ chủ nhóm có thể bật/tắt duyệt thành viên.</p>
                      )}
                    </div>

                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Thành viên nhóm</p>
                      <p className="text-sm text-[#d6f8ec]">{selectedConversation?.memberCount ?? 0} thành viên</p>
                      <button
                        type="button"
                        onClick={openMembersView}
                        className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]"
                      >
                        Xem thành viên
                      </button>
                    </div>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Bảng tin nhóm</p>
                      <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                      <p className="text-sm text-[#d6f8ec]">Ghi chú, ghim, bình chọn</p>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                      <div className="grid grid-cols-4 gap-2">
                        {mediaItems.length > 0 ? (
                          mediaItems.map((media) => (
                            <a
                              key={media._id}
                              href={media.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block h-12 overflow-hidden rounded-lg bg-[#0d3b2f] hover:opacity-80"
                            >
                              {media.type === 'image' ? (
                                <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs text-[#d6f8ec]">▶</div>
                              )}
                            </a>
                          ))
                        ) : (
                          <p className="col-span-4 text-xs text-[#8abfab]">Chưa có ảnh/video nào</p>
                        )}
                      </div>
                      <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                    </div>
                    {/* File section for group */}
                    <div className="mt-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">File</p>
                      {fileItems.length > 0 ? (
                        fileItems.map((file) => {
                          const fileName = typeof file.content === 'string' && file.content.length > 0 ? file.content : 'Tệp đính kèm';
                          return (
                            <a
                              key={file._id}
                              href={file.mediaUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate text-sm text-[#d6f8ec] hover:text-[#46e6b8] hover:underline"
                            >
                              {fileName}
                            </a>
                          );
                        })
                      ) : (
                        <p className="text-xs text-[#8abfab]">Chưa có file nào</p>
                      )}
                      <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => { void handleLeaveGroup(); }}
                      className="mt-4 w-full rounded-xl border border-[#7a3131] bg-[#4a1e1e] px-3 py-2 text-sm font-semibold text-[#ffd5d5] hover:bg-[#5d2525]"
                    >
                      Rời nhóm
                    </button>
                  </>
                )}
              </div>

              {isArchiveOpen && (
                <div className="absolute inset-0 z-10 flex flex-col bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)]">
                  <div className="flex items-center justify-between border-b border-[#1d5a48] px-4 py-3">
                    <button type="button" onClick={() => setIsArchiveOpen(false)} className="rounded-lg bg-[#0f4335] px-3 py-1.5 text-sm text-[#c7f4e6]">Quay lại</button>
                    <h4 className="text-base font-semibold text-[#e2fff4]">Kho lưu trữ</h4>
                    <span className="w-16" />
                  </div>
                  <div className="flex gap-2 border-b border-[#1d5a48] px-4 py-3 text-sm">
                    <button type="button" onClick={() => setArchiveTab('media')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'media' ? 'bg-[#1f7a60] text-[#e6fff5]' : 'bg-[#0f4335] text-[#a6e3cf]'}`}>Ảnh/Video</button>
                    <button type="button" onClick={() => setArchiveTab('files')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'files' ? 'bg-[#1f7a60] text-[#e6fff5]' : 'bg-[#0f4335] text-[#a6e3cf]'}`}>Files</button>
                    <button type="button" onClick={() => setArchiveTab('links')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'links' ? 'bg-[#1f7a60] text-[#e6fff5]' : 'bg-[#0f4335] text-[#a6e3cf]'}`}>Links</button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {archiveTab === 'media' && (
                      <div className="grid grid-cols-3 gap-3">
                        {allMediaItems.length === 0 && <p className="col-span-full text-sm text-[#8abfab]">Chưa có ảnh/video nào.</p>}
                        {allMediaItems.map((media) => (
                          <a key={media._id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="block h-24 overflow-hidden rounded-lg bg-[#0d3b2f]">
                            {media.type === 'image' ? (
                              <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-[#d6f8ec]">▶ Video</div>
                            )}
                          </a>
                        ))}
                      </div>
                    )}
                    {archiveTab === 'files' && (
                      <div className="space-y-2">
                        {allFileItems.length === 0 && <p className="text-sm text-[#8abfab]">Chưa có file nào.</p>}
                        {allFileItems.map((file) => (
                          <a key={file._id} href={file.mediaUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-[#0f4335] px-3 py-2 text-sm text-[#d6f8ec] hover:text-[#46e6b8]">
                            {typeof file.content === 'string' && file.content.length > 0 ? file.content : 'Tệp đính kèm'}
                          </a>
                        ))}
                      </div>
                    )}
                    {archiveTab === 'links' && (
                      <div className="space-y-2">
                        {allLinkItems.length === 0 && <p className="text-sm text-[#8abfab]">Chưa có link nào.</p>}
                        {allLinkItems.map((msg) => {
                          const content = typeof msg.content === 'string' ? msg.content : '';
                          return (
                            <a key={msg._id} href={content.startsWith('http') ? content : `https://${content}`} target="_blank" rel="noreferrer" className="block rounded-lg bg-[#0f4335] px-3 py-2 text-sm text-[#b9f0df] hover:text-[#46e6b8]">
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
                <div className="absolute inset-0 z-10 flex flex-col bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)]">
                  <div className="flex items-center justify-between border-b border-[#1d5a48] px-4 py-3">
                    <button type="button" onClick={() => setIsMembersViewOpen(false)} className="rounded-lg bg-[#0f4335] px-3 py-1.5 text-sm text-[#c7f4e6]">Quay lại</button>
                    <h4 className="text-base font-semibold text-[#e2fff4]">Thành viên</h4>
                    <span className="w-16" />
                  </div>

                  <div className="border-b border-[#1d5a48] px-4 py-3">
                    <button
                      type="button"
                      onClick={openAddMembersModal}
                      className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]"
                    >
                      + Thêm thành viên
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-3">
                    <p className="mb-3 text-sm font-semibold text-[#d6f8ec]">Danh sách thành viên ({groupMemberPreview.length})</p>
                    <div className="space-y-2">
                      {groupMemberPreview.map((member) => {
                        const isCreator = groupCreatorId === member._id;
                        const isAdmin = groupAdminIds.includes(member._id);
                        const isMe = chatPanelProps.currentUserId === member._id;

                        return (
                          <div key={member._id} className="flex items-center justify-between rounded-xl bg-[#0d3a2f] px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-[#e6fff5]">{member.displayName} {isMe ? '(Bạn)' : ''}</p>
                              <p className="text-xs text-[#8cc4b0]">
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
          <aside className="zync-glass-panel zync-glass-panel-strong relative ml-auto h-full w-[88%] max-w-sm overflow-y-auto border-l zync-glass-divider bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#e2fff4]">{isMembersViewOpen ? 'Thành viên' : isArchiveOpen ? 'Kho lưu trữ' : infoTitle}</h3>
              <button
                type="button"
                className="rounded-full bg-[#0f4335] px-3 py-1 text-sm text-[#a6e3cf]"
                onClick={handleCloseInfoPanel}
              >
                Đóng
              </button>
            </div>

            <div className={(isArchiveOpen || isMembersViewOpen) ? 'hidden' : ''}>
            <div className="mb-5 flex flex-col items-center text-center">
              <button
                type="button"
                className={`mb-3 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#245948] text-lg font-bold text-[#d6fbee] ${isGroupConversation ? 'cursor-pointer' : 'cursor-default'}`}
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
                className={`text-lg font-semibold text-[#e2fff4] ${isGroupConversation ? 'cursor-pointer hover:text-[#bff8e6]' : 'cursor-default'}`}
                onClick={isGroupConversation ? () => { void handleChangeGroupName(); } : undefined}
                disabled={!isGroupConversation || isCreatingGroup}
                title={isGroupConversation ? 'Đổi tên nhóm' : undefined}
              >
                {selectedConversation?.name ?? 'Hội thoại'}
              </button>
              <p className="text-sm text-[#8abfab]">
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
                  ? 'border-[#ffcf99]/35 bg-[#4a3417] text-[#ffe2bd]'
                  : 'border-transparent bg-[#0d3b2f] text-[#c7f4e6]'}`}
              >
                {isConversationMuted ? 'Bật thông báo' : 'Tắt thông báo'}
              </button>
              <button
                type="button"
                onClick={() => { void handleTogglePinConversation(); }}
                className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${isConversationPinned
                  ? 'border-[#89f7d7]/35 bg-[#165542] text-[#d6fff0]'
                  : 'border-transparent bg-[#0d3b2f] text-[#c7f4e6]'}`}
              >
                {isConversationPinned ? 'Bỏ ghim' : 'Ghim hội thoại'}
              </button>
              {isGroupConversation ? (
                <>
                  <button
                    type="button"
                    onClick={openAddMembersModal}
                    className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]"
                  >
                    Thêm thành viên
                  </button>
                  {canManageGroup ? (
                    <button
                      type="button"
                      onClick={() => setIsManageGroupOpen(true)}
                      className="col-span-3 rounded-xl bg-[#1f7a60] px-2 py-2 text-xs font-semibold text-[#e6fff5]"
                    >
                      Quản lý nhóm
                    </button>
                  ) : (
                    <p className="col-span-3 rounded-xl bg-[#0d3b2f] px-3 py-2 text-xs text-[#9bcbb9]">
                      Bạn có thể đề xuất thêm thành viên. Khi bật duyệt, chỉ chủ nhóm mới có thể duyệt thêm thành viên.
                    </p>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={openCreateGroupModal}
                  className="rounded-xl bg-[#1f7a60] px-2 py-2 text-xs font-semibold text-[#e6fff5]"
                >
                  Tạo nhóm trò chuyện
                </button>
              )}
            </div>

            {(isConversationMuted || isConversationPinned) && (
              <p className="mb-5 rounded-xl border border-[#1f5e4b] bg-[#0a3128] px-3 py-2 text-xs text-[#bfead9]">
                {isConversationPinned ? 'Đã ghim hội thoại. ' : ''}
                {isConversationMuted ? 'Đang tắt thông báo cho hội thoại này.' : ''}
              </p>
            )}

            {!isGroupConversation && (
              <>
                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Nhắc hẹn</p>
                  <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                  <p className="text-sm text-[#d6f8ec]">22 nhóm chung</p>
                </div>
                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaItems.length > 0 ? (
                      mediaItems.map((media) => (
                        <a
                          key={media._id}
                          href={media.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-12 overflow-hidden rounded-lg bg-[#0d3b2f] hover:opacity-80"
                        >
                          {media.type === 'image' ? (
                            <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[#d6f8ec]">▶</div>
                          )}
                        </a>
                      ))
                    ) : (
                      <p className="col-span-4 text-xs text-[#8abfab]">Chưa có ảnh/video nào</p>
                    )}
                  </div>
                  <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                </div>
                <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">File</p>
                  {fileItems.length > 0 ? (
                    fileItems.map((file) => {
                      const fileName = typeof file.content === 'string' && file.content.length > 0 ? file.content : 'Tệp đính kèm';
                      return (
                        <a
                          key={file._id}
                          href={file.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-[#d6f8ec] hover:text-[#46e6b8] hover:underline"
                        >
                          {fileName}
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-xs text-[#8abfab]">Chưa có file nào</p>
                  )}
                  <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                </div>
              </>
            )}

            {isGroupConversation && (
              <>
                <div className="mb-4 space-y-3 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Duyệt thành viên</p>
                  <p className="text-sm text-[#d6f8ec]">
                    Trạng thái: {memberApprovalEnabled ? 'ON - cần chủ nhóm duyệt' : 'OFF - thêm thẳng vào nhóm'}
                  </p>
                  {isCurrentUserGroupCreator ? (
                    <button
                      type="button"
                      disabled={isCreatingGroup}
                      onClick={handleToggleMemberApproval}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${memberApprovalEnabled
                        ? 'bg-[#1f7a60] text-[#e6fff5]'
                        : 'bg-[#0f4335] text-[#a6e3cf]'} disabled:opacity-60`}
                    >
                      {memberApprovalEnabled ? 'Tắt duyệt' : 'Bật duyệt'}
                    </button>
                  ) : (
                    <p className="text-xs text-[#8cc4b0]">Chỉ chủ nhóm có thể bật/tắt duyệt thành viên.</p>
                  )}
                </div>

                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Thành viên nhóm</p>
                  <p className="text-sm text-[#d6f8ec]">{selectedConversation?.memberCount ?? 0} thành viên</p>
                  <button
                    type="button"
                    onClick={openMembersView}
                    className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]"
                  >
                    Xem thành viên
                  </button>
                </div>
                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Bảng tin nhóm</p>
                  <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                  <p className="text-sm text-[#d6f8ec]">Ghi chú, ghim, bình chọn</p>
                </div>
                <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                  <div className="grid grid-cols-4 gap-2">
                    {mediaItems.length > 0 ? (
                      mediaItems.map((media) => (
                        <a
                          key={media._id}
                          href={media.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block h-12 overflow-hidden rounded-lg bg-[#0d3b2f] hover:opacity-80"
                        >
                          {media.type === 'image' ? (
                            <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[#d6f8ec]">▶</div>
                          )}
                        </a>
                      ))
                    ) : (
                      <p className="col-span-4 text-xs text-[#8abfab]">Chưa có ảnh/video nào</p>
                    )}
                  </div>
                  <button type="button" onClick={() => openArchiveView('media')} className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                </div>
                {/* File section for group (mobile view) */}
                <div className="mt-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">File</p>
                  {fileItems.length > 0 ? (
                    fileItems.map((file) => {
                      const fileName = typeof file.content === 'string' && file.content.length > 0 ? file.content : 'Tệp đính kèm';
                      return (
                        <a
                          key={file._id}
                          href={file.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate text-sm text-[#d6f8ec] hover:text-[#46e6b8] hover:underline"
                        >
                          {fileName}
                        </a>
                      );
                    })
                  ) : (
                    <p className="text-xs text-[#8abfab]">Chưa có file nào</p>
                  )}
                  <button type="button" onClick={() => openArchiveView('files')} className="mt-2 w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                </div>
                <button
                  type="button"
                  onClick={() => { void handleLeaveGroup(); }}
                  className="mt-4 w-full rounded-xl border border-[#7a3131] bg-[#4a1e1e] px-3 py-2 text-sm font-semibold text-[#ffd5d5]"
                >
                  Rời nhóm
                </button>
              </>
            )}
            </div>

            {isArchiveOpen && (
              <div className="absolute inset-0 z-10 flex flex-col bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" onClick={() => setIsArchiveOpen(false)} className="rounded-lg bg-[#0f4335] px-3 py-1.5 text-sm text-[#c7f4e6]">Quay lại</button>
                  <h4 className="text-base font-semibold text-[#e2fff4]">Kho lưu trữ</h4>
                  <span className="w-16" />
                </div>
                <div className="mb-3 flex gap-2 text-sm">
                  <button type="button" onClick={() => setArchiveTab('media')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'media' ? 'bg-[#1f7a60] text-[#e6fff5]' : 'bg-[#0f4335] text-[#a6e3cf]'}`}>Ảnh/Video</button>
                  <button type="button" onClick={() => setArchiveTab('files')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'files' ? 'bg-[#1f7a60] text-[#e6fff5]' : 'bg-[#0f4335] text-[#a6e3cf]'}`}>Files</button>
                  <button type="button" onClick={() => setArchiveTab('links')} className={`rounded-lg px-3 py-1.5 ${archiveTab === 'links' ? 'bg-[#1f7a60] text-[#e6fff5]' : 'bg-[#0f4335] text-[#a6e3cf]'}`}>Links</button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {archiveTab === 'media' && (
                    <div className="grid grid-cols-3 gap-3">
                      {allMediaItems.length === 0 && <p className="col-span-full text-sm text-[#8abfab]">Chưa có ảnh/video nào.</p>}
                      {allMediaItems.map((media) => (
                        <a key={media._id} href={media.mediaUrl} target="_blank" rel="noreferrer" className="block h-24 overflow-hidden rounded-lg bg-[#0d3b2f]">
                          {media.type === 'image' ? (
                            <img src={media.mediaUrl} alt="media" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-[#d6f8ec]">▶ Video</div>
                          )}
                        </a>
                      ))}
                    </div>
                  )}
                  {archiveTab === 'files' && (
                    <div className="space-y-2">
                      {allFileItems.length === 0 && <p className="text-sm text-[#8abfab]">Chưa có file nào.</p>}
                      {allFileItems.map((file) => (
                        <a key={file._id} href={file.mediaUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-[#0f4335] px-3 py-2 text-sm text-[#d6f8ec] hover:text-[#46e6b8]">
                          {typeof file.content === 'string' && file.content.length > 0 ? file.content : 'Tệp đính kèm'}
                        </a>
                      ))}
                    </div>
                  )}
                  {archiveTab === 'links' && (
                    <div className="space-y-2">
                      {allLinkItems.length === 0 && <p className="text-sm text-[#8abfab]">Chưa có link nào.</p>}
                      {allLinkItems.map((msg) => {
                        const content = typeof msg.content === 'string' ? msg.content : '';
                        return (
                          <a key={msg._id} href={content.startsWith('http') ? content : `https://${content}`} target="_blank" rel="noreferrer" className="block rounded-lg bg-[#0f4335] px-3 py-2 text-sm text-[#b9f0df] hover:text-[#46e6b8]">
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
              <div className="absolute inset-0 z-10 flex flex-col bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)] p-5">
                <div className="mb-4 flex items-center justify-between">
                  <button type="button" onClick={() => setIsMembersViewOpen(false)} className="rounded-lg bg-[#0f4335] px-3 py-1.5 text-sm text-[#c7f4e6]">Quay lại</button>
                  <h4 className="text-base font-semibold text-[#e2fff4]">Thành viên</h4>
                  <span className="w-16" />
                </div>

                <button
                  type="button"
                  onClick={openAddMembersModal}
                  className="mb-4 w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]"
                >
                  + Thêm thành viên
                </button>

                <div className="flex-1 overflow-y-auto">
                  <p className="mb-3 text-sm font-semibold text-[#d6f8ec]">Danh sách thành viên ({groupMemberPreview.length})</p>
                  <div className="space-y-2">
                    {groupMemberPreview.map((member) => {
                      const isCreator = groupCreatorId === member._id;
                      const isAdmin = groupAdminIds.includes(member._id);
                      const isMe = chatPanelProps.currentUserId === member._id;

                      return (
                        <div key={member._id} className="rounded-xl bg-[#0d3a2f] px-3 py-2">
                          <p className="truncate text-sm font-medium text-[#e6fff5]">{member.displayName} {isMe ? '(Bạn)' : ''}</p>
                          <p className="text-xs text-[#8cc4b0]">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#1d5a48] bg-[#06271f] p-5">
            <h4 className="text-lg font-semibold text-[#e2fff4]">Đổi tên nhóm</h4>
            <input
              value={renameGroupDraft}
              onChange={(e) => setRenameGroupDraft(e.target.value)}
              className="mt-3 w-full rounded-xl border border-[#1f5e4b] bg-[#0a3128] px-3 py-2 text-sm text-[#d8f7ec] outline-none"
              placeholder="Nhập tên nhóm mới"
              maxLength={100}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setIsRenameGroupOpen(false)} className="rounded-lg bg-[#0f4335] px-3 py-2 text-sm text-[#b8ebdb]">Hủy</button>
              <button type="button" onClick={() => { void handleSubmitGroupNameChange(); }} className="rounded-lg bg-[#1f7a60] px-3 py-2 text-sm font-semibold text-[#e6fff5]">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {isMuteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#1d5a48] bg-[#06271f] p-5">
            <h4 className="text-lg font-semibold text-[#e2fff4]">Tắt thông báo</h4>
            <div className="mt-3 space-y-2">
              <button type="button" onClick={() => { void handleMuteConversation('1h'); }} className="w-full rounded-xl bg-[#0f4335] px-3 py-2 text-left text-sm text-[#d6f8ec]">Trong 1 giờ</button>
              <button type="button" onClick={() => { void handleMuteConversation('4h'); }} className="w-full rounded-xl bg-[#0f4335] px-3 py-2 text-left text-sm text-[#d6f8ec]">Trong 4 giờ</button>
              <button type="button" onClick={() => { void handleMuteConversation('8h'); }} className="w-full rounded-xl bg-[#0f4335] px-3 py-2 text-left text-sm text-[#d6f8ec]">Trong 8 giờ</button>
              <button type="button" onClick={() => { void handleMuteConversation('until_enabled'); }} className="w-full rounded-xl bg-[#0f4335] px-3 py-2 text-left text-sm text-[#d6f8ec]">Cho đến khi tôi bật lại</button>
            </div>
            <button type="button" onClick={() => setIsMuteModalOpen(false)} className="mt-4 w-full rounded-lg bg-[#12392f] px-3 py-2 text-sm text-[#b8ebdb]">Đóng</button>
          </div>
        </div>
      )}

      {isLeaveGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-[#6d2f2f] bg-[#2a1515] p-5">
            <h4 className="text-lg font-semibold text-[#ffe4e4]">Rời nhóm</h4>
            <p className="mt-2 text-sm text-[#ffc7c7]">Bạn có chắc muốn rời nhóm này?</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsLeaveGroupModalOpen(false)}
                className="rounded-lg bg-[#3a2323] px-3 py-2 text-sm text-[#ffd7d7]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => { void handleConfirmLeaveGroup(); }}
                className="rounded-lg bg-[#8b3535] px-3 py-2 text-sm font-semibold text-[#ffe9e9]"
              >
                Rời nhóm
              </button>
            </div>
          </div>
        </div>
      )}

      {groupManageError && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 rounded-xl border border-[#7a3131] bg-[#421f1f] px-4 py-3 text-sm text-[#ffd0d0]">
          {groupManageError}
        </div>
      )}

      {groupManageSuccess && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[92%] max-w-lg -translate-x-1/2 rounded-xl border border-[#1f5e4b] bg-[#0a3128] px-4 py-3 text-sm text-[#d4fbe9]">
          {groupManageSuccess}
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
