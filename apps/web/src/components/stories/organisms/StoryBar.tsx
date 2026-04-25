'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { StoryAvatar } from '../atoms/StoryAvatar';
import { StorySkeleton } from '../atoms/StorySkeleton';
import { getInitials } from '../utils';
import type { StoryBarProps } from '../stories.types';

export function StoryBar({
  feed,
  myStories,
  currentUserId,
  currentUserName,
  loading,
  onViewStory,
  onViewMyStory,
  onCreateStory,
}: StoryBarProps) {
  const hasMyStory = myStories.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [feed]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -180 : 180, behavior: 'smooth' });
  };

  // Sort feed: unseen stories first, then seen stories
  const sortedFeed = useMemo(() => {
    return [...feed].sort((a, b) => {
      if (a.userId === currentUserId || b.userId === currentUserId) return 0;
      const aAllSeen = a.stories.every((s) => s.viewerIds.includes(currentUserId));
      const bAllSeen = b.stories.every((s) => s.viewerIds.includes(currentUserId));
      if (aAllSeen && !bAllSeen) return 1;
      if (!aAllSeen && bAllSeen) return -1;
      return 0;
    });
  }, [feed, currentUserId]);

  // Map sorted index to original feed index for viewer navigation
  const getOriginalIndex = (sortedIdx: number) => {
    const sorted = sortedFeed[sortedIdx];
    return feed.findIndex((g) => g.userId === sorted.userId);
  };

  if (loading) {
    return (
      <div className="relative rounded-xl border border-story-border/20 bg-story-surface/30 p-1 backdrop-blur-sm sm:rounded-2xl">
        <StorySkeleton count={6} variant="bar" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-xl border border-story-border/25 bg-story-surface/35 p-1 backdrop-blur-sm sm:rounded-2xl"
      role="region"
      aria-label="Stories"
    >
      {/* Left scroll arrow — desktop only */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-14 items-center bg-gradient-to-r from-story-surface/95 to-transparent pl-1 sm:flex sm:w-16">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Cuộn trái"
            className="pointer-events-auto story-action-glass story-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full text-story-accent shadow-lg transition-all duration-200 hover:scale-110 sm:h-8 sm:w-8"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Right scroll arrow — desktop only */}
      {canScrollRight && (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-14 items-center justify-end bg-gradient-to-l from-story-surface/95 to-transparent pr-1 sm:flex sm:w-16">
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Cuộn phải"
            className="pointer-events-auto story-action-glass story-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full text-story-accent shadow-lg transition-all duration-200 hover:scale-110 sm:h-8 sm:w-8"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-1.5 py-2.5 scrollbar-hide story-scroll-snap sm:gap-4 sm:px-2 sm:py-3"
      >
        {/* My Story */}
        <div className="relative flex shrink-0 flex-col items-center gap-1.5 animate-story-enter sm:gap-2">
          <StoryAvatar
            initials={currentUserName ? getInitials(currentUserName) : ''}
            seen={false}
            isOwner={!hasMyStory}
            size="md"
            storyCount={hasMyStory ? myStories.length : undefined}
            onClick={hasMyStory ? onViewMyStory : onCreateStory}
          />
          {hasMyStory && (
            <button
              type="button"
              onClick={onCreateStory}
              aria-label="Tạo story mới"
              className="absolute -bottom-0.5 -right-0.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-story-accent to-emerald-500 text-[0.55rem] font-bold text-story-bg shadow-[0_2px_10px_rgba(48,215,171,0.45)] ring-2 ring-story-surface transition-all duration-200 active:scale-90 sm:h-6 sm:w-6 sm:text-[0.6rem]"
            >
              +
            </button>
          )}
          <span className="max-w-[64px] truncate text-[0.6rem] font-medium text-story-text-dim sm:max-w-[76px] sm:text-[0.7rem]">
            {hasMyStory ? 'Story của tôi' : 'Tạo Story'}
          </span>
        </div>

        {/* Separator */}
        {sortedFeed.length > 0 && (
          <div className="flex shrink-0 items-center px-0.5">
            <div className="h-10 w-px rounded-full bg-gradient-to-b from-transparent via-story-border/50 to-transparent sm:h-12" />
          </div>
        )}

        {/* Friend stories (sorted: unseen first) */}
        {sortedFeed.map((group, sortedIdx) => {
          if (group.userId === currentUserId) return null;
          const allSeen = group.stories.every((s) =>
            s.viewerIds.includes(currentUserId),
          );
          const originalIdx = getOriginalIndex(sortedIdx);
          return (
            <div
              key={group.userId}
              className="flex shrink-0 flex-col items-center gap-1.5 animate-story-enter sm:gap-2"
              style={{ animationDelay: `${(sortedIdx + 1) * 55}ms` }}
            >
              <StoryAvatar
                initials={getInitials(group.displayName)}
                avatarUrl={group.avatarUrl}
                seen={allSeen}
                size="md"
                storyCount={group.stories.length > 1 ? group.stories.length : undefined}
                dimmed={allSeen}
                onClick={() => onViewStory(originalIdx)}
              />
              <span className={[
                'max-w-[64px] truncate text-[0.6rem] sm:max-w-[76px] sm:text-[0.7rem]',
                allSeen ? 'text-story-muted' : 'text-story-text-dim font-medium',
              ].join(' ')}>
                {group.displayName}
              </span>
            </div>
          );
        })}

        {/* Empty state */}
        {feed.length === 0 && !hasMyStory && (
          <div className="flex items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-4">
            <div className="text-xl sm:text-2xl">📷</div>
            <div>
              <p className="text-[0.75rem] font-medium text-story-text-dim sm:text-sm">Chưa có story nào</p>
              <p className="text-[0.65rem] text-story-muted sm:text-xs">Hãy tạo story đầu tiên!</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
