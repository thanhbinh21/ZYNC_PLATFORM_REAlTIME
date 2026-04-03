'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StoryProgressBar } from '../atoms/StoryProgressBar';
import { ReactionPicker } from '../molecules/ReactionPicker';
import { StoryReplyInput } from '../molecules/StoryReplyInput';
import { getInitials, FONT_CLASS_MAP } from '../utils';
import type { StoryReactionType, StoryViewerProps } from '../stories.types';

const STORY_DURATION = 5000;

export function StoryViewer({
  feed,
  initialGroupIndex,
  currentUserId,
  onClose,
  onReact,
  onReply,
  onView,
  onDelete,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const group = feed[groupIdx];
  const story = group?.stories[storyIdx];
  const storyId = story?._id;
  const isOwner = group?.userId === currentUserId;

  const goNextRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (storyId) onView(storyId);
  }, [storyId, onView]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setStoryIdx((p) => p + 1);
    } else if (groupIdx < feed.length - 1) {
      setGroupIdx((p) => p + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  }, [group, storyIdx, groupIdx, feed.length, onClose]);

  goNextRef.current = goNext;
  const stableGoNext = useCallback(() => goNextRef.current(), []);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx((p) => p - 1);
    } else if (groupIdx > 0) {
      setGroupIdx((p) => p - 1);
      setStoryIdx(feed[groupIdx - 1].stories.length - 1);
    }
  }, [storyIdx, groupIdx, feed]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, goNext, goPrev]);

  useEffect(() => {
    const handleUp = () => setPaused(false);
    document.addEventListener('mouseup', handleUp);
    document.addEventListener('touchend', handleUp);
    return () => {
      document.removeEventListener('mouseup', handleUp);
      document.removeEventListener('touchend', handleUp);
    };
  }, []);

  const handleReact = (emoji: StoryReactionType) => {
    if (story) onReact(story._id, emoji);
    setShowReactions(false);
  };

  const handleReply = (content: string) => {
    if (story) onReply(story._id, content);
  };

  if (!group || !story) return null;

  const fontClass = FONT_CLASS_MAP[story.fontStyle || 'sans'] || 'font-sans';

  const timeAgo = (() => {
    const diff = Date.now() - new Date(story.createdAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Vừa xong';
    if (mins < 60) return `${mins} phút trước`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020806]/92 backdrop-blur-2xl animate-story-backdrop"
      onMouseDown={() => setPaused(true)}
      onTouchStart={() => setPaused(true)}
    >
      {/* Story card */}
      <div className="relative flex h-full w-full max-w-[420px] flex-col overflow-hidden bg-story-bg sm:my-4 sm:h-[calc(100vh-2rem)] sm:rounded-3xl sm:border sm:border-white/[0.06] sm:shadow-[0_0_80px_-12px_rgba(48,215,171,0.15)] animate-story-viewer-in">

        {/* Top gradient overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 h-36 bg-gradient-to-b from-black/70 via-black/40 to-transparent" />

        {/* Progress bars */}
        <div className="absolute inset-x-0 top-0 z-30 px-3 pt-2.5">
          <StoryProgressBar
            total={group.stories.length}
            current={storyIdx}
            duration={STORY_DURATION}
            paused={paused}
            onComplete={stableGoNext}
          />
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-3 px-4 pt-7">
          {/* Avatar */}
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-story-accent to-emerald-600 p-[2px] shadow-[0_0_12px_rgba(48,215,171,0.25)]">
            <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-story-bg text-xs font-semibold text-story-text">
              {group.avatarUrl ? (
                <img src={group.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(group.displayName)
              )}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-wide text-white">{group.displayName}</p>
            <p className="text-[0.65rem] font-medium text-white/40">{timeAgo}</p>
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => { onDelete(story._id); goNext(); }}
              aria-label="Xóa story"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 backdrop-blur-xl transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-400 hover:shadow-[0_0_16px_rgba(239,68,68,0.15)]"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" />
                <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 010-2H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3a.5.5 0 000 1h11a.5.5 0 000-1h-11z" clipRule="evenodd" />
              </svg>
              Xóa
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.06] bg-white/5 text-white/50 backdrop-blur-xl transition-all duration-200 hover:bg-white/10 hover:text-white hover:shadow-[0_0_12px_rgba(255,255,255,0.06)]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tap navigation zones */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-0 top-0 z-10 flex h-full w-1/3 items-center justify-start pl-2 opacity-0 transition-opacity duration-200 hover:opacity-100"
          aria-label="Story trước"
        >
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/30 text-white/60 backdrop-blur-xl transition-all duration-200 hover:bg-black/50">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-0 top-0 z-10 flex h-full w-1/3 items-center justify-end pr-2 opacity-0 transition-opacity duration-200 hover:opacity-100"
          aria-label="Story tiếp"
        >
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-black/30 text-white/60 backdrop-blur-xl transition-all duration-200 hover:bg-black/50">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </div>
        </button>

        {/* Story content */}
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          {story.mediaType === 'text' && (
            <div
              className="flex h-full w-full items-center justify-center p-10"
              style={{ backgroundColor: story.backgroundColor || '#0d3a30' }}
            >
              <p className={`max-w-prose text-center text-2xl leading-relaxed text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)] ${fontClass}`}>
                {story.content}
              </p>
            </div>
          )}
          {story.mediaType === 'image' && story.mediaUrl && (
            <img src={story.mediaUrl} alt="" className="h-full w-full object-contain" />
          )}
          {story.mediaType === 'video' && story.mediaUrl && (
            <video src={story.mediaUrl} autoPlay muted playsInline className="h-full w-full object-contain" />
          )}
        </div>

        {/* Bottom gradient overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-52 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Footer - reactions & reply */}
        {!isOwner && (
          <div className="absolute inset-x-0 bottom-0 z-30 space-y-3 px-4 pb-5 animate-story-fade-up">
            {showReactions && (
              <div className="flex justify-center">
                <ReactionPicker onSelect={handleReact} />
              </div>
            )}
            <div className="flex items-end gap-2.5">
              <div className="min-w-0 flex-1">
                <StoryReplyInput onSend={handleReply} />
              </div>
              <button
                type="button"
                onClick={() => setShowReactions((p) => !p)}
                aria-label="Thả reaction"
                className={[
                  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg',
                  'border backdrop-blur-2xl transition-all duration-300',
                  showReactions
                    ? 'border-story-accent/40 bg-story-accent/15 shadow-[0_0_20px_rgba(48,215,171,0.25)] scale-110'
                    : 'border-white/[0.08] bg-black/40 hover:bg-black/60 hover:border-white/15 hover:scale-105',
                ].join(' ')}
              >
                ❤️
              </button>
            </div>
          </div>
        )}

        {/* View count for owner */}
        {isOwner && (
          <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center pb-6 animate-story-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/40 px-4 py-2.5 text-xs font-medium text-white/50 backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.3)]">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-story-accent/70">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 011.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 011.172 8z" />
                <path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z" />
              </svg>
              <span>{story.viewerIds.length} lượt xem</span>
            </div>
          </div>
        )}
      </div>

      {/* Desktop side navigation */}
      {groupIdx > 0 && (
        <button
          type="button"
          onClick={goPrev}
          aria-label="Nhóm story trước"
          className="absolute left-4 top-1/2 z-40 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.06] bg-white/5 p-3.5 text-white/40 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white/10 hover:text-white hover:shadow-[0_0_24px_rgba(255,255,255,0.06)] sm:inline-flex"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>
      )}
      {groupIdx < feed.length - 1 && (
        <button
          type="button"
          onClick={goNext}
          aria-label="Nhóm story tiếp"
          className="absolute right-4 top-1/2 z-40 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/[0.06] bg-white/5 p-3.5 text-white/40 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:bg-white/10 hover:text-white hover:shadow-[0_0_24px_rgba(255,255,255,0.06)] sm:inline-flex"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
