'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import type { Message, MessageStatus } from '@zync/shared-types';
import { MessageBubble } from '../atoms/message-bubble';

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

function FlagIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

const REACTIONS = ['❤️', '👍', '😆', '😢', '😡'];

// ─── Types ───
interface MessageItemProps {
  message: Message;
  isSender: boolean;
  canRecall: boolean;
  senderAvatar?: string;
  messageStatus?: Record<string, MessageStatus | string>;
  onDeleteForMe?: (messageId: string, idempotencyKey: string) => void;
  onRecall?: (messageId: string, idempotencyKey: string) => void;
  onForward?: (message: Message) => void;
  onReport?: (messageId: string) => void;
  onReact?: (messageId: string, reactionType: string) => void;
}

// ─── Main Component ───
export function MessageItem({
  message,
  isSender,
  canRecall,
  senderAvatar,
  messageStatus,
  onDeleteForMe,
  onRecall,
  onForward,
  onReport,
  onReact,
}: MessageItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

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

  const handleReportClick = useCallback(() => {
    onReport?.(message.idempotencyKey || message._id);
    setShowMenu(false);
  }, [message.idempotencyKey, message._id, onReport]);

  const handleReactClick = useCallback((emoji: string) => {
    onReact?.(message._id, emoji);
    setShowMenu(false);
  }, [message._id, onReact]);

  // Handle click outside when menu is open
  useEffect(() => {
    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu, handleClickOutside]);

  // Check if message is recalled
  const isRecalled = message.type === 'system-recall' && message.content === '[Tin nhắn đã được thu hồi]';

  return (
    <div
      ref={messageRef}
      className={`group relative flex gap-3 ${isSender ? 'justify-end' : 'justify-start'}`}
      onContextMenu={handleContextMenu}
    >
      {/* Message Bubble with Action Button */}
      <div className="relative mb-2 max-w-full">
        <div className={`relative max-w-full ${isSender ? 'ml-auto w-fit' : 'w-fit'}`}>
          {/* Action Menu Button (outside bubble) */}
          {!isRecalled && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className={`absolute top-1 ${isSender ? '-left-7' : '-right-7'} inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#1a4a3e]/90 hover:bg-[#1f5946] transition-colors flex-shrink-0 z-30`}
              title="Thêm tùy chọn"
            >
              <EllipsisVerticalIcon className="h-3.5 w-3.5 text-[#88b8a7]" />
            </button>
          )}

          <MessageBubble
            isOwn={isSender}
            content={message.content}
            type={message.type}
            mediaUrl={message.mediaUrl}
            moderationWarning={Boolean((message as any).moderationWarning)}
            status={status}
            timestamp={message.createdAt}
            senderAvatar={senderAvatar}
          />

          {/* Sender Context Menu: delete / recall / forward */}
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
                <span>Xóa cho tôi</span>
              </button>

              {canRecall && (
                <button
                  onClick={handleRecallClick}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors border-b border-[#234a3f]"
                >
                  <ArrowUturnLeftIcon className="h-4 w-4 flex-shrink-0" />
                  <span>Thu hồi</span>
                </button>
              )}

              <button
                onClick={handleForwardClick}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-[#d8f7ec] hover:bg-[#1a4a3e] transition-colors"
              >
                <ForwardIcon className="h-4 w-4 flex-shrink-0" />
                <span>Chuyển tiếp</span>
              </button>
            </div>
          )}

          {/* Receiver Context Menu: reactions + report */}
          {!isSender && !isRecalled && showMenu && (
            <div
              ref={menuRef}
              className="absolute left-0 top-full mt-1 z-50 rounded-xl border border-[#2f6657] bg-[#0e3329] shadow-xl"
              style={{ minWidth: '220px' }}
            >
              <div className="flex items-center gap-1 px-3 py-2 border-b border-[#234a3f]">
                {REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactClick(emoji)}
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
                <span>Báo cáo vi phạm</span>
              </button>
            </div>
          )}
        </div>
        {isRecalled && (
          <p className="text-xs text-[#99c2b3] italic mt-1">
            {isSender ? 'Bạn đã thu hồi tin nhắn này' : 'Tin nhắn đã được thu hồi'}
          </p>
        )}

        {/* Reactions display below bubble */}
        {(message as any).reactions && (message as any).reactions.length > 0 && (
          <div className={`flex flex-wrap gap-1 mt-1 ${isSender ? 'justify-end' : 'justify-start'}`}>
            {Array.from(
              new Map((message as any).reactions.map((r: any) => [r.type, r])).values()
            ).map((r: any) => {
              const count = (message as any).reactions!.filter((x: any) => x.type === r.type).length;
              return (
                <button
                  key={r.type}
                  onClick={() => handleReactClick(r.type)}
                  className="inline-flex items-center gap-1 rounded-full bg-[#0d3228] border border-[#2a6057] px-2 py-0.5 text-xs text-[#9dd8c5] hover:bg-[#123e32] transition-colors"
                >
                  <span>{r.type}</span>
                  {count > 1 && <span>{count}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
