'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StoryProgressBar } from '../atoms/StoryProgressBar';
import { ReactionPicker } from '../molecules/ReactionPicker';
import { StoryReplyInput } from '../molecules/StoryReplyInput';
import { getInitials } from '../utils';
import { FONT_CLASS_MAP } from '../utils';
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onMouseDown={() => setPaused(true)}
      onTouchStart={() => setPaused(true)}
    >
      <div className="relative flex h-full w-full max-w-md flex-col">
        {/* Progress */}
        <div className="absolute left-0 right-0 top-0 z-20 px-3 pt-3">
          <StoryProgressBar
            total={group.stories.length}
            current={storyIdx}
            duration={STORY_DURATION}
            paused={paused}
            onComplete={stableGoNext}
          />
        </div>

        {/* Header */}
        <div className="absolute left-0 right-0 top-0 z-20 flex items-center gap-3 px-4 pt-8">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#b0e4d2] text-xs font-semibold text-[#0a2a22]">
            {group.avatarUrl ? (
              <img src={group.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              getInitials(group.displayName)
            )}
          </span>
          <div className="flex-1">
            <p className="font-ui-title text-sm text-white">{group.displayName}</p>
            <p className="font-ui-meta text-[0.65rem] text-white/60">
              {new Date(story.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {isOwner && (
            <button
              type="button"
              onClick={() => { onDelete(story._id); goNext(); }}
              aria-label="Xóa story"
              className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 transition hover:bg-red-500/30 hover:text-white"
            >
              Xóa
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="text-white/70 transition hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Navigation zones */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="absolute left-0 top-0 z-10 h-full w-1/3"
          aria-label="Story trước"
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="absolute right-0 top-0 z-10 h-full w-1/3"
          aria-label="Story tiếp"
        />

        {/* Content */}
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          {story.mediaType === 'text' && (
            <div
              className="flex h-full w-full items-center justify-center p-8"
              style={{ backgroundColor: story.backgroundColor || '#0d3a30' }}
            >
              <p className={`max-w-prose text-center text-2xl leading-relaxed text-white ${fontClass}`}>
                {story.content}
              </p>
            </div>
          )}
          {story.mediaType === 'image' && story.mediaUrl && (
            <img src={story.mediaUrl} alt="" className="h-full w-full object-contain" />
          )}
          {story.mediaType === 'video' && story.mediaUrl && (
            <video
              src={story.mediaUrl}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-contain"
            />
          )}
        </div>

        {/* Footer */}
        {!isOwner && (
          <div className="absolute bottom-0 left-0 right-0 z-20 space-y-3 px-4 pb-6">
            {showReactions && (
              <div className="flex justify-center">
                <ReactionPicker onSelect={handleReact} />
              </div>
            )}
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <StoryReplyInput onSend={handleReply} />
              </div>
              <button
                type="button"
                onClick={() => setShowReactions((p) => !p)}
                aria-label="Thả reaction"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/40 text-lg backdrop-blur-md transition hover:bg-black/60"
              >
                ❤️
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
