'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { StoryProgressBarProps } from '../stories.types';

export function StoryProgressBar({ total, current, duration, paused, onComplete }: StoryProgressBarProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef(0);
  const elapsedBeforePauseRef = useRef(0);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const elapsed = elapsedBeforePauseRef.current + (performance.now() - startTimeRef.current);
    const pct = Math.min((elapsed / duration) * 100, 100);

    if (progressRef.current) {
      progressRef.current.style.width = `${pct}%`;
    }

    if (elapsed >= duration) {
      onComplete();
      return;
    }

    rafRef.current = requestAnimationFrame(animate);
  }, [duration, onComplete]);

  // Reset on story change
  useEffect(() => {
    elapsedBeforePauseRef.current = 0;
    startTimeRef.current = performance.now();
    if (progressRef.current) progressRef.current.style.width = '0%';
  }, [current]);

  // Start/pause animation
  useEffect(() => {
    if (paused) {
      // Store elapsed time before pause
      elapsedBeforePauseRef.current += performance.now() - startTimeRef.current;
      cancelAnimationFrame(rafRef.current);
      return;
    }

    // Resume from where we left off
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(rafRef.current);
  }, [current, paused, animate]);

  return (
    <div
      className={`flex gap-[3px] transition-opacity duration-200 ${paused ? 'story-progress-paused' : ''}`}
      role="progressbar"
      aria-label={`Story ${current + 1} trong ${total}`}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={current + 1}
    >
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.15]"
        >
          {/* Completed segments */}
          {i < current && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-story-accent via-emerald-400 to-story-accent-warm shadow-[0_0_6px_rgba(48,215,171,0.5)]" />
          )}

          {/* Active segment with animated fill */}
          {i === current && (
            <div
              ref={progressRef}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-story-accent via-emerald-400 to-story-accent-warm shadow-[0_0_10px_rgba(48,215,171,0.6)]"
              style={{ width: '0%', willChange: 'width' }}
            >
              {/* Glowing tip */}
              <div className="absolute -right-1 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_8px_rgba(48,215,171,0.8)] animate-story-progress-glow" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
