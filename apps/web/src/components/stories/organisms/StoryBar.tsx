'use client';

import { useRef, useState, useEffect } from 'react';
import { StoryAvatar } from '../atoms/StoryAvatar';
import { getInitials } from '../utils';
import type { StoryBarProps } from '../stories.types';

export function StoryBar({ feed, myStories, currentUserId, currentUserName, onViewStory, onViewMyStory, onCreateStory }: StoryBarProps) {
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
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
  };

  return (
    <div className="relative rounded-2xl border border-story-border/30 bg-story-surface/40 p-1 backdrop-blur-sm">
      {/* Left fade + arrow */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 flex w-14 items-center bg-gradient-to-r from-story-surface/90 to-transparent pl-1">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Cuộn trái"
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-story-border/40 bg-story-card/80 text-story-accent shadow-lg backdrop-blur-lg transition-all duration-200 hover:scale-110 hover:border-story-accent/30 hover:bg-story-card hover:shadow-story-glow"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Right fade + arrow */}
      {canScrollRight && (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 flex w-14 items-center justify-end bg-gradient-to-l from-story-surface/90 to-transparent pr-1">
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Cuộn phải"
            className="pointer-events-auto inline-flex h-8 w-8 items-center justify-center rounded-full border border-story-border/40 bg-story-card/80 text-story-accent shadow-lg backdrop-blur-lg transition-all duration-200 hover:scale-110 hover:border-story-accent/30 hover:bg-story-card hover:shadow-story-glow"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex gap-4 overflow-x-auto px-2 py-3 scrollbar-hide">
        {/* My Story */}
        <div className="relative flex shrink-0 flex-col items-center gap-2 animate-story-enter">
          <StoryAvatar
            initials={currentUserName ? getInitials(currentUserName) : ''}
            seen={false}
            isOwner={!hasMyStory}
            size="md"
            onClick={hasMyStory ? onViewMyStory : onCreateStory}
          />
          {hasMyStory && (
            <button
              type="button"
              onClick={onCreateStory}
              aria-label="Tạo story mới"
              className="absolute -bottom-0.5 -right-0.5 z-10 inline-flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-story-accent to-emerald-500 text-[0.6rem] font-bold text-story-bg shadow-lg ring-2 ring-story-surface transition-all duration-200 hover:scale-110 hover:shadow-[0_0_12px_rgba(48,215,171,0.5)]"
            >
              +
            </button>
          )}
          <span className="max-w-[76px] truncate text-[0.7rem] font-medium text-story-text-dim">
            {hasMyStory ? 'Story của tôi' : 'Tạo Story'}
          </span>
        </div>

        {/* Separator */}
        {feed.length > 0 && (
          <div className="flex shrink-0 items-center px-0.5">
            <div className="h-12 w-px rounded-full bg-gradient-to-b from-transparent via-story-border/60 to-transparent" />
          </div>
        )}

        {/* Friend stories */}
        {feed.map((group, idx) => {
          if (group.userId === currentUserId) return null;
          const allSeen = group.stories.every((s) =>
            s.viewerIds.includes(currentUserId),
          );
          return (
            <div
              key={group.userId}
              className="flex shrink-0 flex-col items-center gap-2 animate-story-enter"
              style={{ animationDelay: `${(idx + 1) * 60}ms` }}
            >
              <StoryAvatar
                initials={getInitials(group.displayName)}
                avatarUrl={group.avatarUrl}
                seen={allSeen}
                size="md"
                onClick={() => onViewStory(idx)}
              />
              <span className="max-w-[76px] truncate text-[0.7rem] text-story-text-dim">
                {group.displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
