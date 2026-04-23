'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { StoryProgressBar } from '../atoms/StoryProgressBar';
import { StoryCtaButton } from '../atoms/StoryCtaButton';
import { VolumeSlider } from '../atoms/VolumeSlider';
import { ReactionPicker } from '../molecules/ReactionPicker';
import { StoryActionBar } from '../molecules/StoryActionBar';
import { getInitials, FONT_CLASS_MAP, formatTimeAgo, clamp, preloadMedia } from '../utils';
import type { StoryReactionType, StoryViewerProps } from '../stories.types';

const STORY_DURATION = 6000;

export function StoryViewer({
  feed,
  initialGroupIndex,
  currentUserId,
  onClose,
  onReact,
  onReply,
  onView,
  onDelete,
  onShare,
}: StoryViewerProps) {
  const [groupIdx, setGroupIdx] = useState(initialGroupIndex);
  const [storyIdx, setStoryIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [liked, setLiked] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [transition, setTransition] = useState<'none' | 'next' | 'prev'>('none');
  const [isMuted, setIsMuted] = useState(true);
  const [volume, setVolume] = useState(0.7);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // Swipe state
  const [swipeY, setSwipeY] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const frameRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const volumeHoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const group = feed[groupIdx];
  const story = group?.stories[storyIdx];
  const storyId = story?._id;
  const isOwner = group?.userId === currentUserId;

  const goNextRef = useRef<() => void>(() => {});

  // Lock body scroll on mount, restore on unmount
  useEffect(() => {
    const scrollY = window.scrollY;
    document.body.classList.add('story-viewer-open');
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.classList.remove('story-viewer-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, []);

  // Focus trap: focus the container on mount
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Track view
  useEffect(() => {
    if (storyId) onView(storyId);
  }, [storyId, onView]);

  // Check if current story is liked
  useEffect(() => {
    if (story) {
      const hasLiked = story.reactions.some(
        (r) => r.userId === currentUserId && r.type === '❤️',
      );
      setLiked(hasLiked);
    }
  }, [story, currentUserId]);

  // Reset transition after animation
  useEffect(() => {
    if (transition !== 'none') {
      const t = setTimeout(() => setTransition('none'), 500);
      return () => clearTimeout(t);
    }
  }, [transition]);

  // Auto-pause on tab/visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setPaused(true);
      } else {
        setPaused(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Preload next story media
  useEffect(() => {
    if (!group) return;

    // Preload next story in same group
    const nextInGroup = group.stories[storyIdx + 1];
    if (nextInGroup?.mediaUrl && nextInGroup.mediaType !== 'text') {
      preloadMedia(nextInGroup.mediaUrl, nextInGroup.mediaType as 'image' | 'video');
    }

    // Preload first story of next group
    const nextGroup = feed[groupIdx + 1];
    if (nextGroup?.stories[0]?.mediaUrl && nextGroup.stories[0].mediaType !== 'text') {
      preloadMedia(nextGroup.stories[0].mediaUrl, nextGroup.stories[0].mediaType as 'image' | 'video');
    }
  }, [group, storyIdx, groupIdx, feed]);

  // Update video volume
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const goNext = useCallback(() => {
    if (!group) return;
    if (storyIdx < group.stories.length - 1) {
      setTransition('next');
      setStoryIdx((p) => p + 1);
    } else if (groupIdx < feed.length - 1) {
      setTransition('next');
      setGroupIdx((p) => p + 1);
      setStoryIdx(0);
    } else {
      handleClose();
    }
    setShowReactions(false);
    setShowVolumeSlider(false);
  }, [group, storyIdx, groupIdx, feed.length]);

  goNextRef.current = goNext;
  const stableGoNext = useCallback(() => goNextRef.current(), []);

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setTransition('prev');
      setStoryIdx((p) => p - 1);
    } else if (groupIdx > 0) {
      setTransition('prev');
      setGroupIdx((p) => p - 1);
      setStoryIdx(feed[groupIdx - 1].stories.length - 1);
    }
    setShowReactions(false);
    setShowVolumeSlider(false);
  }, [storyIdx, groupIdx, feed]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => onClose(), 300);
  }, [onClose]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't handle keyboard events when typing in reply input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'Escape') handleClose();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); }
      if (e.key === 'm') setIsMuted((p) => !p);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleClose, goNext, goPrev]);

  // Touch handlers for swipe-to-exit and tap navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    setIsSwiping(false);

    // Long press to pause
    longPressTimerRef.current = setTimeout(() => {
      setPaused(true);
    }, 200);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const dy = touch.clientY - touchStartRef.current.y;
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);

    // Clear long press if moving
    if (Math.abs(dy) > 10 || dx > 10) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    // Swipe down to close
    if (dy > 0 && dy > dx) {
      setIsSwiping(true);
      setSwipeY(dy * 0.6); // Damped
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPaused(false);

    const touch = e.changedTouches[0];
    const duration = Date.now() - touchStartRef.current.time;

    if (isSwiping) {
      setIsSwiping(false);
      if (swipeY > 120) {
        handleClose();
      } else {
        setSwipeY(0);
      }
      return;
    }

    setSwipeY(0);

    // Detect tap (short, minimal movement)
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);
    if (duration < 300 && dx < 15 && dy < 15) {
      const frameWidth = frameRef.current?.clientWidth || 400;
      const tapX = touch.clientX - (frameRef.current?.getBoundingClientRect().left || 0);
      if (tapX < frameWidth * 0.35) {
        goPrev();
      } else if (tapX > frameWidth * 0.65) {
        goNext();
      }
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = () => {
    longPressTimerRef.current = setTimeout(() => {
      setPaused(true);
    }, 200);
  };

  const handleMouseUp = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setPaused(false);
  };

  const handleReact = (emoji: StoryReactionType) => {
    if (story) {
      onReact(story._id, emoji);
      if (emoji === '❤️') setLiked(true);
    }
    setShowReactions(false);
  };

  const handleReply = (content: string) => {
    if (story) onReply(story._id, content);
  };

  const handleLike = () => {
    if (story) {
      if (!liked) {
        onReact(story._id, '❤️');
        setLiked(true);
      }
    }
  };

  // Volume hover handlers
  const handleVolumeMouseEnter = () => {
    if (volumeHoverTimerRef.current) clearTimeout(volumeHoverTimerRef.current);
    setShowVolumeSlider(true);
  };

  const handleVolumeMouseLeave = () => {
    volumeHoverTimerRef.current = setTimeout(() => {
      setShowVolumeSlider(false);
    }, 300);
  };

  if (!group || !story) return null;

  const fontClass = FONT_CLASS_MAP[story.fontStyle || 'sans'] || 'font-sans';
  const timeAgo = formatTimeAgo(story.createdAt);

  // Swipe transform
  const swipeTransform = isSwiping || swipeY > 0
    ? {
        transform: `translateY(${swipeY}px) scale(${1 - swipeY * 0.001})`,
        opacity: clamp(1 - swipeY * 0.003, 0, 1),
        transition: isSwiping ? 'none' : 'all 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
      }
    : {};

  const transitionClass =
    transition === 'next' ? 'animate-story-3d-next' :
    transition === 'prev' ? 'animate-story-3d-prev' : '';

  // Get backdrop media URL for blurred background
  const backdropMediaUrl = story.mediaType !== 'text' && story.mediaUrl
    ? story.mediaUrl
    : null;

  return (
    <div
      ref={containerRef}
      className={[
        'story-viewer-container',
        isClosing ? 'animate-story-backdrop-out' : 'animate-story-backdrop',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-label="Story viewer"
      tabIndex={-1}
    >
      {/* Blurred media backdrop (desktop) */}
      {backdropMediaUrl && (
        <img
          src={backdropMediaUrl}
          alt=""
          aria-hidden="true"
          className="story-viewer-backdrop-media hidden sm:block"
        />
      )}

      {/* Story frame */}
      <div
        ref={frameRef}
        className={[
          'story-viewer-frame',
          isClosing ? 'animate-story-viewer-out' : 'animate-story-viewer-in',
        ].join(' ')}
        style={swipeTransform}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Top gradient overlay */}
        <div className="story-glass-top" />

        {/* Progress bars */}
        <div className="absolute inset-x-0 top-0 z-30 px-3 pt-2.5 story-safe-top">
          <StoryProgressBar
            total={group.stories.length}
            current={storyIdx}
            duration={STORY_DURATION}
            paused={paused || showReactions}
            onComplete={stableGoNext}
          />
        </div>

        {/* Header */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 pt-7 sm:gap-3 sm:px-4 story-safe-top">
          {/* Avatar */}
          <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-story-accent to-emerald-600 p-[2px] shadow-[0_0_14px_rgba(48,215,171,0.3)] sm:h-10 sm:w-10">
            <span className="inline-flex h-full w-full items-center justify-center rounded-full bg-story-bg text-[0.6rem] font-semibold text-story-text sm:text-xs">
              {group.avatarUrl ? (
                <img src={group.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(group.displayName)
              )}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8rem] font-semibold tracking-wide text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)] sm:text-sm">
              {group.displayName}
            </p>
            <p className="text-[0.6rem] font-medium text-white/45 sm:text-[0.65rem]">{timeAgo}</p>
          </div>

          {/* Mute toggle for video (with volume hover) */}
          {story.mediaType === 'video' && (
            <div
              className="relative"
              onMouseEnter={handleVolumeMouseEnter}
              onMouseLeave={handleVolumeMouseLeave}
            >
              {showVolumeSlider && (
                <VolumeSlider
                  volume={volume}
                  muted={isMuted}
                  onChange={(v) => setVolume(v)}
                  onMuteToggle={() => setIsMuted((p) => !p)}
                />
              )}
              <button
                type="button"
                onClick={() => setIsMuted((p) => !p)}
                aria-label={isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                className="story-action-glass story-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-all duration-200 active:scale-90 sm:h-9 sm:w-9"
              >
                {isMuted ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <path d="M9.547 3.062A.75.75 0 0110 3.75v12.5a.75.75 0 01-1.264.546L5.203 13H3.75A.75.75 0 013 12.25v-4.5A.75.75 0 013.75 7h1.453l3.533-3.796a.75.75 0 01.811-.142z" />
                    <path d="M13.28 7.22a.75.75 0 10-1.06 1.06L13.94 10l-1.72 1.72a.75.75 0 101.06 1.06L15 11.06l1.72 1.72a.75.75 0 101.06-1.06L16.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L15 8.94l-1.72-1.72z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <path d="M10 3.75a.75.75 0 00-1.264-.546L5.203 7H3.75A.75.75 0 003 7.75v4.5c0 .414.336.75.75.75h1.453l3.533 3.796A.75.75 0 0010 16.25V3.75z" />
                    <path d="M14.02 5.78a.75.75 0 011.06 0 8.25 8.25 0 010 8.44.75.75 0 01-1.06-1.06 6.75 6.75 0 000-6.32.75.75 0 010-1.06z" />
                    <path d="M12.556 7.744a.75.75 0 011.06 0 4.5 4.5 0 010 4.512.75.75 0 11-1.06-1.06 3 3 0 000-2.392.75.75 0 010-1.06z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {/* Delete for owner */}
          {isOwner && (
            <button
              type="button"
              onClick={() => { onDelete(story._id); goNext(); }}
              aria-label="Xóa story"
              className="story-action-glass story-focus-ring inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[0.65rem] font-medium text-white/60 transition-all duration-200 active:scale-95 sm:gap-1.5 sm:px-3 sm:text-xs"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" />
                <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 010-2H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3a.5.5 0 000 1h11a.5.5 0 000-1h-11z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Xóa</span>
            </button>
          )}

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Đóng story viewer"
            className="story-action-glass story-focus-ring inline-flex h-8 w-8 items-center justify-center rounded-full text-white/50 transition-all duration-200 active:scale-90 sm:h-9 sm:w-9"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 sm:h-5 sm:w-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Tap navigation zones — visible on mobile too */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="story-tap-zone left-0 w-1/3 sm:hidden"
          aria-label="Story trước"
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="story-tap-zone right-0 w-1/3 sm:hidden"
          aria-label="Story tiếp"
        />
        {/* Desktop tap zones with hover indicators */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goPrev(); }}
          className="story-tap-zone left-0 hidden w-1/3 items-center justify-start pl-2 opacity-0 transition-opacity duration-200 hover:opacity-100 sm:flex"
          aria-label="Story trước"
        >
          <div className="story-action-glass inline-flex h-9 w-9 items-center justify-center rounded-full text-white/60">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </div>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); goNext(); }}
          className="story-tap-zone right-0 hidden w-1/3 items-center justify-end pr-2 opacity-0 transition-opacity duration-200 hover:opacity-100 sm:flex"
          aria-label="Story tiếp"
        >
          <div className="story-action-glass inline-flex h-9 w-9 items-center justify-center rounded-full text-white/60">
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </div>
        </button>

        {/* Story content */}
        <div className={`flex flex-1 items-center justify-center overflow-hidden ${transitionClass}`}>
          {story.mediaType === 'text' && (
            <div
              className="flex h-full w-full items-center justify-center p-6 sm:p-8 animate-story-content-in"
              style={{ backgroundColor: story.backgroundColor || '#0d3a30' }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.04),transparent_70%)]" />
              <p className={`relative max-w-prose text-center text-xl leading-relaxed text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.5)] sm:text-2xl ${fontClass}`}>
                {story.content}
              </p>
            </div>
          )}

          {story.mediaType === 'image' && story.mediaUrl && (
            <div className="relative flex h-full w-full items-center justify-center animate-story-content-in">
              <img src={story.mediaUrl} alt="" className="story-media-blur-bg" aria-hidden="true" />
              <img src={story.mediaUrl} alt="" className="story-media-main animate-story-ken-burns" loading="lazy" />
            </div>
          )}

          {story.mediaType === 'video' && story.mediaUrl && (
            <div className="relative flex h-full w-full items-center justify-center animate-story-content-in">
              <video src={story.mediaUrl} className="story-media-blur-bg" muted aria-hidden="true" />
              <video
                ref={videoRef}
                src={story.mediaUrl}
                autoPlay
                loop
                muted={isMuted}
                playsInline
                className="story-media-main"
              />
            </div>
          )}
        </div>

        {/* Bottom gradient overlay */}
        <div className="story-glass-bottom" />

        {/* CTA Button */}
        {story.ctaUrl && story.ctaLabel && (
          <div className="absolute inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-32 sm:pb-36">
            <StoryCtaButton label={story.ctaLabel} url={story.ctaUrl} />
          </div>
        )}

        {/* Footer */}
        {!isOwner && (
          <div className="absolute inset-x-0 bottom-0 z-30 space-y-2 px-3 pb-4 sm:px-4 sm:pb-5 story-safe-bottom">
            {/* Reaction picker */}
            {showReactions && (
              <div className="flex justify-center animate-story-fade-up">
                <ReactionPicker onSelect={handleReact} />
              </div>
            )}

            {/* Action bar */}
            <StoryActionBar
              liked={liked}
              onLike={handleLike}
              onComment={() => {}}
              onShare={() => onShare?.(story._id)}
              onReply={handleReply}
              disabled={false}
            />

            {/* Reaction toggle */}
            <div className="flex justify-center pt-0.5 sm:pt-1">
              <button
                type="button"
                onClick={() => setShowReactions((p) => !p)}
                aria-label="Thả reaction"
                className={[
                  'story-focus-ring inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[0.7rem] font-medium transition-all duration-300 active:scale-95 sm:px-4 sm:text-xs',
                  showReactions
                    ? 'story-action-glass border-story-accent/30 !bg-story-accent/10 text-story-accent shadow-[0_0_16px_rgba(48,215,171,0.2)]'
                    : 'story-action-glass text-white/50',
                ].join(' ')}
              >
                <span className="text-sm">😊</span>
                {showReactions ? 'Ẩn' : 'Reaction'}
              </button>
            </div>
          </div>
        )}

        {/* View count for owner */}
        {isOwner && (
          <div className="absolute inset-x-0 bottom-0 z-30 flex flex-col items-center gap-2 pb-5 sm:gap-3 sm:pb-6 animate-story-fade-up story-safe-bottom">
            <div className="story-action-glass inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[0.8rem] font-medium text-white/60 sm:gap-2.5 sm:px-5 sm:py-3 sm:text-sm">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5 text-story-accent/70 sm:h-4 sm:w-4">
                <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 011.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0114.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 011.172 8z" />
                <path d="M8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4.5 8a3.5 3.5 0 117 0 3.5 3.5 0 01-7 0z" />
              </svg>
              <span>{story.viewerIds.length} lượt xem</span>
            </div>

            {/* Swipe hint */}
            <div className="flex flex-col items-center gap-1 text-white/20">
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 animate-story-float">
                <path fillRule="evenodd" d="M14.77 12.79a.75.75 0 01-1.06-.02L10 8.832 6.29 12.77a.75.75 0 11-1.08-1.04l4.25-4.5a.75.75 0 011.08 0l4.25 4.5a.75.75 0 01-.02 1.06z" clipRule="evenodd" />
              </svg>
              <span className="text-[0.55rem] font-medium tracking-wide sm:text-[0.6rem]">Vuốt xuống để đóng</span>
            </div>
          </div>
        )}

        {/* Pause indicator */}
        {paused && (
          <div className="absolute inset-0 z-25 flex items-center justify-center pointer-events-none">
            <div className="story-action-glass inline-flex h-12 w-12 items-center justify-center rounded-full animate-story-scale-in sm:h-14 sm:w-14">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6 text-white/80 sm:h-7 sm:w-7">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
              </svg>
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
          className="absolute left-4 top-1/2 z-40 hidden -translate-y-1/2 sm:inline-flex story-action-glass story-focus-ring items-center justify-center rounded-full p-3.5 text-white/40 transition-all duration-300 hover:scale-110 hover:text-white hover:shadow-[0_0_28px_rgba(255,255,255,0.08)]"
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
          className="absolute right-4 top-1/2 z-40 hidden -translate-y-1/2 sm:inline-flex story-action-glass story-focus-ring items-center justify-center rounded-full p-3.5 text-white/40 transition-all duration-300 hover:scale-110 hover:text-white hover:shadow-[0_0_28px_rgba(255,255,255,0.08)]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
