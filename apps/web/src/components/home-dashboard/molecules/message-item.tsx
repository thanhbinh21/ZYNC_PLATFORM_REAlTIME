'use client';

import Image from 'next/image';
import { useRef, useState, useCallback, useEffect } from 'react';
import type { Message, MessageStatus } from '@zync/shared-types';
import { MessageBubble } from '../atoms/message-bubble';
import type { ReactionDetailsResponse } from '@/services/chat';

function EllipsisVerticalIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function TrashIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function ArrowUturnLeftIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7v6h6" />
      <path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13" />
    </svg>
  );
}

function ForwardIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8l4 4m0 0l-4 4m4-4H8m6 0a4 4 0 100-8" />
    </svg>
  );
}

function EmptyLikeIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 20h-4a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2h4" />
      <path d="M14 10V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2v3h2a2 2 0 0 1 1.94 2.49l-1.2 6A2 2 0 0 1 18.79 19H10V10Z" />
    </svg>
  );
}

function FlagIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

const QUICK_REACTIONS = ['👍', '❤️', '🤣', '😳', '😭', '😡'];
const DEFAULT_MENU_REACTIONS = ['❤️', '👍', '😆', '😢', '😡'];
const PICKER_HIDE_DELAY_MS = 700;

interface MessageItemProps {
  message: Message;
  isSender: boolean;
  canRecall: boolean;
  senderAvatar?: string;
  messageStatus?: Record<string, MessageStatus | string>;
  reactionUserState?: {
    lastEmoji: string | null;
    totalCount: number;
    emojiCounts: Record<string, number>;
  };
  onDeleteForMe?: (messageId: string, idempotencyKey: string) => void;
  onRecall?: (messageId: string, idempotencyKey: string) => void;
  onForward?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onJumpToMessage?: (messageRef: string) => void;
  onReactionUpsert?: (message: Message, emoji: string, delta: 1 | 2 | 3, actionSource: string) => void;
  onReactionRemoveAllMine?: (message: Message) => void;
  onFetchReactionDetails?: (message: Message) => Promise<ReactionDetailsResponse>;
  onReport?: (messageId: string) => void;
  onReact?: (messageId: string, reactionType: string) => void;
}

function ReactionDetailsModal({
  open,
  details,
  loading,
  onClose,
}: {
  open: boolean;
  details: ReactionDetailsResponse | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const visibleRows = (details?.rows || []).filter((row) => row.totalCount > 0);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 px-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-2xl border border-[#1a5c4a] bg-[linear-gradient(180deg,#083328_0%,#05231c_100%)] p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold text-[#dffef2]">Chi tiet cam xuc</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0f4335] px-3 py-1 text-sm text-[#a6e3cf] hover:bg-[#145845]"
          >
            Dong
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-[#8cc4b0]">Dang tai...</p>
        ) : !details || visibleRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#8cc4b0]">Chua co cam xuc cho tin nhan nay.</p>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2">
              {details.tabs.map((tab) => (
                <span key={tab.emoji} className="rounded-full bg-[#0f4335] px-3 py-1 text-sm text-[#d8f7ec]">
                  {tab.emoji} {tab.count}
                </span>
              ))}
            </div>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {visibleRows.map((row) => (
                <div key={row.userId} className="rounded-lg border border-[#175443] bg-[#072d24] px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium text-[#d6f8ec]">{row.displayName}</p>
                    <p className="text-xs text-[#8cc4b0]">{row.totalCount} lan</p>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {Object.entries(row.emojiCounts).map(([emoji, count]) => (
                      <span key={`${row.userId}-${emoji}`} className="rounded-md bg-[#0f4335] px-2 py-0.5 text-xs text-[#a6e3cf]">
                        {emoji} {count}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusDetailsModal({
  open,
  message,
  onClose,
}: {
  open: boolean;
  message: Message;
  onClose: () => void;
}) {
  if (!open) {
    return null;
  }

  const readBy = Array.isArray(message.readBy) ? message.readBy : [];
  const sentTo = Array.isArray(message.sentTo) ? message.sentTo : [];

  return (
    <div className="fixed inset-0 z-[92] flex items-center justify-center bg-black/55 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-[#1a5c4a] bg-[linear-gradient(180deg,#083328_0%,#05231c_100%)] p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold text-[#dffef2]">Thong ke da xem</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0f4335] px-3 py-1 text-sm text-[#a6e3cf] hover:bg-[#145845]"
          >
            Dong
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-[#1a5c4a] bg-[#072d24] p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-[#8cc4b0]">Da xem ({readBy.length})</p>
            {readBy.length === 0 ? (
              <p className="text-sm text-[#8cc4b0]">Chua co ai da xem.</p>
            ) : (
              <div className="space-y-2">
                {readBy.map((item) => (
                  <div key={`read-${item.userId}`} className="rounded-md border border-[#1d5a49] bg-[#0b3a2f] px-2.5 py-2">
                    <div className="flex items-center gap-2.5">
                      {item.avatarUrl ? (
                        <Image
                          src={item.avatarUrl}
                          alt={item.displayName || 'user'}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full border border-[#1f5c4c] object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#1f5c4c] bg-[#1f5c4c] text-[11px] font-semibold text-[#dffef2]">
                          {(item.displayName || 'U').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[#d6f8ec]">{item.displayName}</p>
                        <p className="text-xs text-[#8cc4b0]">
                          {new Date(item.readAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-[#1a5c4a] bg-[#072d24] p-3">
            <p className="mb-2 text-xs uppercase tracking-wide text-[#8cc4b0]">Chua doc ({sentTo.length})</p>
            {sentTo.length === 0 ? (
              <p className="text-sm text-[#8cc4b0]">Tat ca da doc.</p>
            ) : (
              <div className="space-y-2">
                {sentTo.map((item) => (
                  <div key={`sent-${item.userId}`} className="rounded-md border border-[#1d5a49] bg-[#0b3a2f] px-2.5 py-2">
                    <div className="flex items-center gap-2.5">
                      {item.avatarUrl ? (
                        <Image
                          src={item.avatarUrl}
                          alt={item.displayName || 'user'}
                          width={28}
                          height={28}
                          className="h-7 w-7 rounded-full border border-[#1f5c4c] object-cover"
                        />
                      ) : (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#1f5c4c] bg-[#1f5c4c] text-[11px] font-semibold text-[#dffef2]">
                          {(item.displayName || 'U').slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <p className="truncate text-sm font-medium text-[#d6f8ec]">{item.displayName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function isGroupLifecycleNotice(message: Message): boolean {
  const normalized = message.content.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return normalized.includes('đã rời khỏi nhóm')
    || normalized.includes('được bạn thêm vào nhóm')
    || normalized.includes('được thêm vào nhóm')
    || normalized.includes('đã bị xóa khỏi nhóm')
    || normalized.includes('đã bị xoá khỏi nhóm')
    || normalized.includes('là quản trị viên')
    || normalized.includes('là trưởng nhóm');
}

function initialsFromNotice(content: string): string {
  const rawName = content
    .replace(/đã rời khỏi nhóm.*/i, '')
    .replace(/được bạn thêm vào nhóm.*/i, '')
    .replace(/được thêm vào nhóm.*/i, '')
    .replace(/đã bị xóa khỏi nhóm.*/i, '')
    .replace(/đã bị xoá khỏi nhóm.*/i, '')
    .replace(/là quản trị viên.*/i, '')
    .replace(/là trưởng nhóm.*/i, '')
    .trim();

  if (!rawName) {
    return 'HT';
  }

  const parts = rawName.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0]!.slice(0, 2).toUpperCase();
  }

  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}

// ─── Main Component ───
export function MessageItem({
  message,
  isSender,
  canRecall,
  senderAvatar,
  messageStatus,
  reactionUserState,
  onDeleteForMe,
  onRecall,
  onForward,
  onReply,
  onJumpToMessage,
  onReactionUpsert,
  onReactionRemoveAllMine,
  onFetchReactionDetails,
  onReport,
  onReact,
}: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [showStatusDetails, setShowStatusDetails] = useState(false);
  const [reactionDetailsLoading, setReactionDetailsLoading] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<ReactionDetailsResponse | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const pickerHideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const status = (messageStatus?.[message._id] || message.status) as MessageStatus | undefined;
  const isLifecycleNotice = isGroupLifecycleNotice(message);
  const lastSelectedEmoji = reactionUserState?.lastEmoji ?? null;

  const summary = message.reactionSummary;
  const summaryEntries = Object.entries(summary?.emojiCounts || {}).sort((a, b) => b[1] - a[1]);
  const hasSummary = (summary?.totalCount || 0) > 0;
  const canClearMine = (reactionUserState?.totalCount || 0) > 0;

  const legacyReactionEntries = Array.isArray((message as any).reactions)
    ? Object.entries(
      ((message as any).reactions as Array<{ type: string }>).reduce<Record<string, number>>((acc, reaction) => {
        if (!reaction?.type) {
          return acc;
        }
        acc[reaction.type] = (acc[reaction.type] || 0) + 1;
        return acc;
      }, {}),
    )
    : [];

  const menuReactions = summaryEntries.length > 0
    ? summaryEntries.slice(0, 5).map(([emoji]) => emoji)
    : DEFAULT_MENU_REACTIONS;

  const isRecalled = message.type === 'system-recall' && message.content === '[Tin nhan da duoc thu hoi]';
  const canOpenReadStats = isSender
    && status === 'read'
    && !isRecalled
    && (message.readByPreview?.length || 0) > 0;

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setShowMenu(false);
    }
    if (messageRef.current && !messageRef.current.contains(event.target as Node)) {
      setShowReactionPicker(false);
    }
  }, []);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    if (!isRecalled) {
      setShowMenu((prev) => !prev);
    }
  }, [isRecalled]);

  const handleDeleteForMeClick = useCallback(() => {
    onDeleteForMe?.(message._id, message.idempotencyKey);
    setShowMenu(false);
  }, [message._id, message.idempotencyKey, onDeleteForMe]);

  const handleRecallClick = useCallback(() => {
    onRecall?.(message._id, message.idempotencyKey);
    setShowMenu(false);
  }, [message._id, message.idempotencyKey, onRecall]);

  const handleForwardClick = useCallback(() => {
    onForward?.(message);
    setShowMenu(false);
  }, [message, onForward]);

  const handleReplyClick = useCallback(() => {
    onReply?.(message);
    setShowMenu(false);
  }, [message, onReply]);

  const handleReactionClick = useCallback((emoji: string, source = 'menu') => {
    if (onReactionUpsert) {
      onReactionUpsert(message, emoji, 1, source);
    } else {
      onReact?.(message._id, emoji);
    }
    setShowReactionPicker(false);
    setShowMenu(false);
  }, [message, onReactionUpsert, onReact]);

  const handleTriggerClick = useCallback(() => {
    if (!lastSelectedEmoji) {
      return;
    }
    handleReactionClick(lastSelectedEmoji, 'trigger-click');
  }, [handleReactionClick, lastSelectedEmoji]);

  const handleOpenReactionDetails = useCallback(async () => {
    if (!onFetchReactionDetails) {
      return;
    }

    setShowReactionDetails(true);
    setReactionDetailsLoading(true);
    try {
      const details = await onFetchReactionDetails(message);
      setReactionDetails(details);
    } finally {
      setReactionDetailsLoading(false);
    }
  }, [message, onFetchReactionDetails]);

  const handleRemoveMineReactions = useCallback(() => {
    onReactionRemoveAllMine?.(message);
    if (pickerHideTimeoutRef.current) {
      clearTimeout(pickerHideTimeoutRef.current);
      pickerHideTimeoutRef.current = null;
    }
    setShowReactionPicker(false);
  }, [message, onReactionRemoveAllMine]);

  const showReactionPickerNow = useCallback(() => {
    if (pickerHideTimeoutRef.current) {
      clearTimeout(pickerHideTimeoutRef.current);
      pickerHideTimeoutRef.current = null;
    }
    setShowReactionPicker(true);
  }, []);

  const hideReactionPickerDelayed = useCallback(() => {
    if (pickerHideTimeoutRef.current) {
      clearTimeout(pickerHideTimeoutRef.current);
    }

    pickerHideTimeoutRef.current = setTimeout(() => {
      setShowReactionPicker(false);
      pickerHideTimeoutRef.current = null;
    }, PICKER_HIDE_DELAY_MS);
  }, []);

  const handleReportClick = useCallback(() => {
    onReport?.(message.idempotencyKey || message._id);
    setShowMenu(false);
  }, [message.idempotencyKey, message._id, onReport]);

  const handleOpenReadStats = useCallback(() => {
    if (!canOpenReadStats) {
      return;
    }
    setShowStatusDetails(true);
  }, [canOpenReadStats]);

  useEffect(() => {
    if (showMenu || showReactionPicker) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu, showReactionPicker, handleClickOutside]);

  useEffect(() => {
    return () => {
      if (pickerHideTimeoutRef.current) {
        clearTimeout(pickerHideTimeoutRef.current);
      }
    };
  }, []);

  if (isLifecycleNotice) {
    const timeStr = new Date(message.createdAt).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div className="my-3 flex flex-col items-center gap-1.5">
        <div className="inline-flex max-w-[90%] items-center gap-2 rounded-full border border-[#2a6252] bg-[#12392f] px-3 py-1.5 text-sm text-[#d6f8ec]">
          <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#1d4b3d] text-[10px] font-semibold text-[#a6e3cf]">
            {initialsFromNotice(message.content)}
          </span>
          <span className="truncate">{message.content}</span>
        </div>
        <span className="rounded-full bg-[#17483a] px-2 py-0.5 text-[11px] text-[#9fd8c4]">{timeStr}</span>
      </div>
    );
  }

  return (
    <div
      ref={messageRef}
      className={`group relative flex gap-3 ${isSender ? 'justify-end' : 'justify-start'}`}
      onContextMenu={handleContextMenu}
    >
      <ReactionDetailsModal
        open={showReactionDetails}
        details={reactionDetails}
        loading={reactionDetailsLoading}
        onClose={() => setShowReactionDetails(false)}
      />
      <StatusDetailsModal
        open={showStatusDetails}
        message={message}
        onClose={() => setShowStatusDetails(false)}
      />

      <div className="relative mb-2 max-w-full min-w-0 flex-1">
        <div className={`relative max-w-full ${isSender ? 'ml-auto w-fit' : 'w-fit'}`}>
          {!isRecalled && (
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className={`absolute top-1 ${isSender ? '-left-7' : '-right-7'} inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1a4a3e]/90 hover:bg-[#1f5946] transition-colors z-2`}
              title="Them tuy chon"
            >
              <EllipsisVerticalIcon className="h-3.5 w-3.5 text-[#88b8a7]" />
            </button>
          )}

          {!isRecalled && (
            <div
              className={`absolute -top-2 z-2 flex items-center gap-1 ${isSender ? '-right-1' : 'left-10'}`}
              onMouseEnter={showReactionPickerNow}
              onMouseLeave={hideReactionPickerDelayed}
            >
              <button
                type="button"
                onClick={handleTriggerClick}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#2f6657] bg-[#0f4335] text-xs text-[#b9e7d8] hover:bg-[#1a4a3e]"
                title="Tha cam xuc"
              >
                {lastSelectedEmoji ? (
                  <span className="text-sm leading-none">{lastSelectedEmoji}</span>
                ) : (
                  <EmptyLikeIcon className="h-3.5 w-3.5" />
                )}
              </button>

              {showReactionPicker && (
                <div
                  onMouseEnter={showReactionPickerNow}
                  onMouseLeave={hideReactionPickerDelayed}
                  className={`absolute ${isSender ? 'right-0' : 'left-0'} -top-10 z-50 flex items-center gap-1 rounded-full border border-[#2f6657] bg-[#12392f] px-2 py-1 shadow-lg`}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReactionClick(emoji, 'picker-select')}
                      className="rounded-full px-1.5 py-0.5 text-base hover:bg-[#1a4a3e]"
                    >
                      {emoji}
                    </button>
                  ))}
                  {canClearMine && (
                    <button
                      type="button"
                      onClick={handleRemoveMineReactions}
                      className="rounded-full px-2 py-0.5 text-xs text-[#ffd2d2] hover:bg-[#5a2b2b]"
                    >
                      Xoa
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <MessageBubble
            isOwn={isSender}
            content={message.content}
            type={message.type}
            mediaUrl={message.mediaUrl}
            replyTo={message.replyTo}
            onJumpToMessage={onJumpToMessage}
            moderationWarning={Boolean((message as any).moderationWarning)}
            status={status}
            readByPreview={message.readByPreview}
            readByCount={message.readBy?.length}
            onReadPreviewPress={canOpenReadStats ? handleOpenReadStats : undefined}
            timestamp={message.createdAt}
            senderAvatar={senderAvatar}
          />

          {isSender && !isRecalled && showMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-1 z-50 rounded-xl border border-[#2f6657] bg-[#0e3329] shadow-xl"
              style={{ minWidth: '160px' }}
            >
              <button
                onClick={handleDeleteForMeClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors border-b border-[#234a3f]"
              >
                <TrashIcon className="h-4 w-4 flex-shrink-0" />
                <span>Xoa cho toi</span>
              </button>

              {canRecall && (
                <button
                  onClick={handleRecallClick}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors border-b border-[#234a3f]"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4 flex-shrink-0" />
                  <span>Thu hoi</span>
                </button>
              )}

              <button
                onClick={handleForwardClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors"
              >
                <ForwardIcon className="h-4 w-4 flex-shrink-0" />
                <span>Chuyen tiep</span>
              </button>

              <button
                onClick={handleReplyClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors border-t border-[#234a3f]"
              >
                <ArrowUturnLeftIcon className="h-4 w-4 flex-shrink-0" />
                <span>Tra loi</span>
              </button>
            </div>
          )}

          {!isSender && !isRecalled && showMenu && (
            <div
              ref={menuRef}
              className="absolute left-0 top-full mt-1 z-50 rounded-xl border border-[#2f6657] bg-[#0e3329] shadow-xl"
              style={{ minWidth: '220px' }}
            >
              <div className="flex items-center gap-1 px-3 py-2 border-b border-[#234a3f]">
                {menuReactions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji, 'receiver-menu')}
                    className="text-xl hover:scale-125 transition-transform p-0.5"
                    title={`React ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                onClick={handleReportClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-orange-300 hover:bg-[#1a4a3e] transition-colors"
              >
                <FlagIcon className="h-4 w-4 flex-shrink-0" />
                <span>Bao cao vi pham</span>
              </button>

              <button
                onClick={handleReplyClick}
                className="flex w-full items-center gap-3 border-t border-[#234a3f] px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors"
              >
                <ArrowUturnLeftIcon className="h-4 w-4 flex-shrink-0" />
                <span>Tra loi</span>
              </button>
            </div>
          )}
        </div>

        {isRecalled && (
          <p className="mt-1 text-xs italic text-[#99c2b3]">
            {isSender ? 'Ban da thu hoi tin nhan nay' : 'Tin nhan da duoc thu hoi'}
          </p>
        )}

        {!isRecalled && hasSummary && (
          <button
            type="button"
            onClick={handleOpenReactionDetails}
            className={`mt-1 inline-flex items-center gap-1 rounded-full border border-[#255447] bg-[#0d342a] px-2.5 py-1 text-xs text-[#a8d8c7] hover:bg-[#16473a] ${isSender ? 'float-right' : ''}`}
            title="Xem chi tiet cam xuc"
            disabled={!onFetchReactionDetails}
          >
            <span className="inline-flex items-center gap-1">
              {summaryEntries.slice(0, 3).map(([emoji]) => (
                <span key={`${message._id}-${emoji}`}>{emoji}</span>
              ))}
            </span>
            <span>{summary?.totalCount || 0}</span>
          </button>
        )}

        {!isRecalled && !hasSummary && legacyReactionEntries.length > 0 && (
          <div className={`mt-1 flex flex-wrap gap-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
            {legacyReactionEntries.map(([emoji, count]) => (
              <button
                key={`${message._id}-${emoji}`}
                onClick={() => handleReactionClick(emoji, 'legacy-pill')}
                className="inline-flex items-center gap-1 rounded-full border border-[#2a6057] bg-[#0d3228] px-2 py-0.5 text-xs text-[#9dd8c5] hover:bg-[#123e32] transition-colors"
              >
                <span>{emoji}</span>
                {count > 1 && <span>{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
