'use client';

import { useState } from 'react';
import type { StoryActionBarProps } from '../stories.types';

export function StoryActionBar({
  liked,
  onLike,
  onComment,
  onShare,
  onReply,
  showReplyInput = false,
  disabled,
}: StoryActionBarProps) {
  const [replyText, setReplyText] = useState('');
  const [showInput, setShowInput] = useState(showReplyInput);
  const [heartAnimating, setHeartAnimating] = useState(false);
  const [shareAnimating, setShareAnimating] = useState(false);

  const handleLike = () => {
    setHeartAnimating(true);
    onLike();
    setTimeout(() => setHeartAnimating(false), 600);
  };

  const handleShare = () => {
    setShareAnimating(true);
    onShare();
    setTimeout(() => setShareAnimating(false), 500);
  };

  const handleSendReply = () => {
    const trimmed = replyText.trim();
    if (!trimmed || disabled) return;
    onReply(trimmed);
    setReplyText('');
    setShowInput(false);
  };

  return (
    <div className="space-y-2.5 animate-story-fade-up sm:space-y-3">
      {/* Reply input (expandable) */}
      {showInput && (
        <div className="flex items-center gap-2 animate-story-fade-up">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full story-action-glass px-3 py-2 sm:px-4 sm:py-2.5">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendReply();
                }
                // Prevent keyboard navigation from bubbling to story viewer
                e.stopPropagation();
              }}
              placeholder="Trả lời story..."
              disabled={disabled}
              maxLength={1000}
              className="min-w-0 flex-1 bg-transparent text-[0.8rem] text-white outline-none placeholder:text-white/30 sm:text-sm"
              autoFocus
              aria-label="Nhập phản hồi"
            />
            <button
              type="button"
              onClick={handleSendReply}
              disabled={!replyText.trim() || disabled}
              aria-label="Gửi phản hồi"
              className={[
                'story-focus-ring inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all duration-300',
                replyText.trim()
                  ? 'bg-gradient-to-br from-story-accent to-emerald-500 text-story-bg shadow-[0_0_12px_rgba(48,215,171,0.4)]'
                  : 'bg-white/[0.06] text-white/20',
              ].join(' ')}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M3.105 3.289a.75.75 0 01.814-.097l13 6.5a.75.75 0 010 1.316l-13 6.5a.75.75 0 01-1.05-.905L5.31 10 2.87 3.384a.75.75 0 01.235-.095z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Action buttons row */}
      <div className="flex items-center justify-between px-0.5 sm:px-1">
        <div className="flex items-center gap-0.5 sm:gap-1">
          {/* Like (Heart) — min 44px touch target */}
          <button
            type="button"
            onClick={handleLike}
            aria-label={liked ? 'Bỏ thích' : 'Thích'}
            className={[
              'story-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full transition-all duration-300 active:scale-90',
              liked ? 'text-red-400' : 'text-white/70 hover:text-white/90',
            ].join(' ')}
          >
            <svg
              viewBox="0 0 24 24"
              className={[
                'h-6 w-6 transition-transform duration-300',
                heartAnimating ? 'animate-story-heart-burst' : '',
                liked ? 'scale-110' : '',
              ].join(' ')}
              fill={liked ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={liked ? 0 : 2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </button>

          {/* Comment */}
          <button
            type="button"
            onClick={() => {
              setShowInput((p) => !p);
              onComment();
            }}
            aria-label="Bình luận"
            className="story-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-all duration-300 hover:text-white/90 active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={handleShare}
            aria-label="Chia sẻ"
            className={[
              'story-focus-ring inline-flex h-11 w-11 items-center justify-center rounded-full text-white/70 transition-all duration-300 hover:text-white/90 active:scale-90',
              shareAnimating ? 'animate-story-share-fly' : '',
            ].join(' ')}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>

        {/* More */}
        <button
          type="button"
          aria-label="Thêm tùy chọn"
          className="story-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full text-white/40 transition-all duration-200 hover:text-white/60 active:scale-90"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M4.5 12a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0zm6 0a1.5 1.5 0 113 0 1.5 1.5 0 01-3 0z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}
