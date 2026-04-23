'use client';

import { useRef, useState, useEffect } from 'react';
import { StoryHighlightCard } from '../molecules/StoryHighlightCard';
import { StorySkeleton } from '../atoms/StorySkeleton';
import type { StoryHighlightsProps } from '../stories.types';

export function StoryHighlights({
  highlights,
  loading,
  onViewHighlight,
  onCreateHighlight,
}: StoryHighlightsProps) {
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
  }, [highlights]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="px-1">
        <StorySkeleton count={6} variant="highlight" />
      </div>
    );
  }

  if (highlights.length === 0 && !onCreateHighlight) return null;

  return (
    <div className="relative" role="region" aria-label="Story Highlights">
      {/* Left scroll */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 hidden w-10 items-center bg-gradient-to-r from-story-surface/90 to-transparent sm:flex">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label="Cuộn highlights trái"
            className="pointer-events-auto story-action-glass inline-flex h-6 w-6 items-center justify-center rounded-full text-story-accent transition-all duration-200 hover:scale-110"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Right scroll */}
      {canScrollRight && (
        <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 hidden w-10 items-center justify-end bg-gradient-to-l from-story-surface/90 to-transparent sm:flex">
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label="Cuộn highlights phải"
            className="pointer-events-auto story-action-glass inline-flex h-6 w-6 items-center justify-center rounded-full text-story-accent transition-all duration-200 hover:scale-110"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto px-2 py-2 scrollbar-hide sm:gap-4"
      >
        {/* Create new highlight */}
        {onCreateHighlight && (
          <button
            type="button"
            onClick={onCreateHighlight}
            className="story-highlight-card story-focus-ring"
            aria-label="Tạo highlight mới"
          >
            <div className="story-highlight-cover flex items-center justify-center border-dashed !border-story-accent/30">
              <div className="inline-flex h-full w-full items-center justify-center bg-gradient-to-br from-story-accent/10 to-story-bg">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5 text-story-accent">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
            </div>
            <span className="text-[0.65rem] font-medium text-story-accent sm:text-[0.7rem]">
              Mới
            </span>
          </button>
        )}

        {/* Highlight cards */}
        {highlights.map((highlight, idx) => (
          <div
            key={highlight._id}
            className="animate-story-enter"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <StoryHighlightCard
              highlight={highlight}
              onClick={() => onViewHighlight(highlight._id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
