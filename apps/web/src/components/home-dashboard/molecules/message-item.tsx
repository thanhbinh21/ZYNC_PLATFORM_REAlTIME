'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { Message, MessageStatus } from '@zync/shared-types';
import { MessageBubble } from '../atoms/message-bubble';
import type { ReactionDetailsResponse } from '@/services/chat';

// ─── Icons ───
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

// ─── Types ───
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
  onReactionUpsert?: (message: Message, emoji: string, delta: 1 | 2 | 3, actionSource: string) => void;
  onReactionRemoveAllMine?: (message: Message) => void;
  onFetchReactionDetails?: (message: Message) => Promise<ReactionDetailsResponse>;
}

const QUICK_REACTIONS = ['👍', '❤️', '🤣', '😳', '😭', '😡'];
const PICKER_HIDE_DELAY_MS = 700;

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
          <h4 className="text-base font-semibold text-[#dffef2]">Chi tiết cảm xúc</h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#0f4335] px-3 py-1 text-sm text-[#a6e3cf] hover:bg-[#145845]"
          >
            Đóng
          </button>
        </div>

        {loading ? (
          <p className="py-6 text-center text-sm text-[#8cc4b0]">Đang tải...</p>
        ) : !details || visibleRows.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#8cc4b0]">Chưa có cảm xúc cho tin nhắn này.</p>
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
                    <p className="text-xs text-[#8cc4b0]">{row.totalCount} lần</p>
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
  onReactionUpsert,
  onReactionRemoveAllMine,
  onFetchReactionDetails,
}: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [reactionDetailsLoading, setReactionDetailsLoading] = useState(false);
  const [reactionDetails, setReactionDetails] = useState<ReactionDetailsResponse | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const pickerHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const status = (messageStatus?.[message._id] || message.status) as MessageStatus | undefined;

  // Close menu when clicking outside
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
      setShowMenu(false);
    }
  }, []);

  // Handle context menu (right-click)
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowMenu(!showMenu);
  }, [showMenu]);

  // Close menu on item click
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

  const handleReactionClick = useCallback(
    (emoji: string) => {
      onReactionUpsert?.(message, emoji, 1, 'picker-select');
      setShowReactionPicker(false);
    },
    [message, onReactionUpsert],
  );

  const lastSelectedEmoji = reactionUserState?.lastEmoji ?? null;

  const handleTriggerClick = useCallback(() => {
    if (!lastSelectedEmoji) {
      return;
    }

    onReactionUpsert?.(message, lastSelectedEmoji, 1, 'trigger-click');
  }, [lastSelectedEmoji, message, onReactionUpsert]);

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

  // Handle click outside when menu is open
  useEffect(() => {
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu, handleClickOutside]);

  useEffect(() => {
    return () => {
      if (pickerHideTimeoutRef.current) {
        clearTimeout(pickerHideTimeoutRef.current);
      }
    };
  }, []);

  // Check if message is recalled
  const isRecalled = message.type === 'system-recall' && message.content === '[Tin nhắn đã được thu hồi]';
  const summary = message.reactionSummary;
  const summaryEntries = Object.entries(summary?.emojiCounts || {}).sort((a, b) => b[1] - a[1]);
  const hasSummary = (summary?.totalCount || 0) > 0;
  const canClearMine = (reactionUserState?.totalCount || 0) > 0;

  return (
    <div
      ref={messageRef}
      className={`group relative flex gap-3 ${isSender ? 'flex-row-reverse' : ''}`}
      onContextMenu={handleContextMenu}
    >
      {/* Message Bubble with Action Button */}
      <div className="flex-1 min-w-0 relative">
        <ReactionDetailsModal
          open={showReactionDetails}
          details={reactionDetails}
          loading={reactionDetailsLoading}
          onClose={() => setShowReactionDetails(false)}
        />

        {/* Action Menu Button (inside bubble) */}
        {!isRecalled && (
          <div className={`absolute -top-2 z-30 flex items-center gap-1 ${isSender ? '-right-1' : 'left-10'}`}>
            <div
              className="relative"
              onMouseEnter={showReactionPickerNow}
              onMouseLeave={hideReactionPickerDelayed}
            >
              <button
                type="button"
                onClick={handleTriggerClick}
                className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[#2f6657] bg-[#0f4335] text-xs text-[#b9e7d8] hover:bg-[#1a4a3e]"
                title="Thả cảm xúc"
              >
                {lastSelectedEmoji ? (
                  <span className="text-sm leading-none">{lastSelectedEmoji}</span>
                ) : (
                  <EmptyLikeIcon className="h-3.5 w-3.5" />
                )}
              </button>

              {showReactionPicker && !isRecalled && (
                <div
                  onMouseEnter={showReactionPickerNow}
                  onMouseLeave={hideReactionPickerDelayed}
                  className={`absolute ${isSender ? 'right-0' : 'left-0'} -top-10 z-50 flex items-center gap-1 rounded-full border border-[#2f6657] bg-[#12392f] px-2 py-1 shadow-lg`}
                >
                  {QUICK_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleReactionClick(emoji)}
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
                      Xóa
                    </button>
                  )}
                </div>
              )}
            </div>

            {isSender && (
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="hidden h-6 w-6 items-center justify-center rounded-full bg-[#1a4a3e] hover:bg-[#1f5946] transition-colors group-hover:flex"
                title="Thêm tùy chọn"
              >
                <EllipsisVerticalIcon className="h-3.5 w-3.5 text-[#88b8a7]" />
              </button>
            )}
          </div>
        )}

        <MessageBubble
          isOwn={isSender}
          content={message.content}
          type={message.type}
          mediaUrl={message.mediaUrl}
          status={status}
          timestamp={message.createdAt}
          senderAvatar={senderAvatar}
        />
        {isRecalled && (
          <p className="text-xs text-[#99c2b3] italic mt-1">
            {isSender ? 'Bạn đã thu hồi tin nhắn này' : 'Tin nhắn đã được thu hồi'}
          </p>
        )}

        {!isRecalled && hasSummary && (
          <button
            type="button"
            onClick={handleOpenReactionDetails}
            className={`mt-1 inline-flex items-center gap-1 rounded-full border border-[#255447] bg-[#0d342a] px-2.5 py-1 text-xs text-[#a8d8c7] hover:bg-[#16473a] ${isSender ? 'float-right' : ''}`}
            title="Xem chi tiết cảm xúc"
          >
            <span className="inline-flex items-center gap-1">
              {summaryEntries.slice(0, 3).map(([emoji]) => (
                <span key={`${message._id}-${emoji}`}>{emoji}</span>
              ))}
            </span>
            <span>{summary?.totalCount || 0}</span>
          </button>
        )}

        {/* Context Menu */}
        {isSender && !isRecalled && (
          <div
            ref={menuRef}
            className={`absolute ${isSender ? 'right-0' : 'left-0'} -top-2 z-50 rounded-lg border border-[#2f6657] bg-[#12392f] shadow-lg transition-opacity ${
              showMenu ? 'opacity-100' : 'fixed opacity-0 pointer-events-none'
            }`}
            style={{
              minWidth: '160px',
            }}
          >
            {/* Delete for me */}
            <button
              onClick={handleDeleteForMeClick}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors border-b border-[#234a3f]"
            >
              <TrashIcon className="h-4 w-4 flex-shrink-0" />
              <span>Xóa cho tôi</span>
            </button>

            {/* Recall */}
            {canRecall && (
              <button
                onClick={handleRecallClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors border-b border-[#234a3f]"
              >
                <ArrowUturnLeftIcon className="h-4 w-4 flex-shrink-0" />
                <span>Thu hồi</span>
              </button>
            )}

            {/* Forward */}
            <button
              onClick={handleForwardClick}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors"
            >
              <ForwardIcon className="h-4 w-4 flex-shrink-0" />
              <span>Chuyển tiếp</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
