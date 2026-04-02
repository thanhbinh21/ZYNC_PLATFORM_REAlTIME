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
    return () => el.removeEventListener('scroll', checkScroll);
  }, [feed]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  return (
    <div className="relative">
      {/* Scroll fade left */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-12 bg-gradient-to-r from-[#062920] to-transparent">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Cuộn trái"
            className="pointer-events-auto absolute left-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0d3a30]/80 text-[#30d7ab] shadow-lg backdrop-blur transition hover:bg-[#1a5140]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Scroll fade right */}
      {canScrollRight && (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-12 bg-gradient-to-l from-[#062920] to-transparent">
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Cuộn phải"
            className="pointer-events-auto absolute right-1 top-1/2 -translate-y-1/2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0d3a30]/80 text-[#30d7ab] shadow-lg backdrop-blur transition hover:bg-[#1a5140]"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div ref={scrollRef} className="flex gap-3 overflow-x-auto px-1 py-2 scrollbar-hide">
        {/* My Story */}
        <div className="relative flex shrink-0 flex-col items-center gap-1.5">
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
              className="absolute -bottom-0.5 -right-0.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#30d7ab] text-[0.6rem] font-bold text-[#033026] shadow-md ring-2 ring-[#062920] transition hover:scale-110 hover:bg-[#3de9ba]"
            >
              +
            </button>
          )}
          <span className="font-ui-meta max-w-[72px] truncate text-[0.68rem] font-medium text-[#8cc4b3]">
            {hasMyStory ? 'Story của tôi' : 'Tạo Story'}
          </span>
        </div>

        {/* Separator */}
        {feed.length > 0 && (
          <div className="flex shrink-0 items-center">
            <div className="h-10 w-px bg-gradient-to-b from-transparent via-[#1a5140] to-transparent" />
          </div>
        )}

        {/* Friend stories */}
        {feed.map((group, idx) => {
          if (group.userId === currentUserId) return null;
          const allSeen = group.stories.every((s) =>
            s.viewerIds.includes(currentUserId),
          );
          return (
            <div key={group.userId} className="flex shrink-0 flex-col items-center gap-1.5">
              <StoryAvatar
                initials={getInitials(group.displayName)}
                avatarUrl={group.avatarUrl}
                seen={allSeen}
                size="md"
                onClick={() => onViewStory(idx)}
              />
              <span className="font-ui-meta max-w-[72px] truncate text-[0.68rem] text-[#8cc4b3]">
                {group.displayName}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
