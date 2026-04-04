'use client';

import { useEffect, useRef } from 'react';
import type { StoryProgressBarProps } from '../stories.types';

export function StoryProgressBar({ total, current, duration, paused, onComplete }: StoryProgressBarProps) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = 0;
    if (progressRef.current) progressRef.current.style.width = '0%';
  }, [current]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const step = 50;
    timerRef.current = setInterval(() => {
      elapsedRef.current += step;
      const pct = Math.min((elapsedRef.current / duration) * 100, 100);
      if (progressRef.current) progressRef.current.style.width = `${pct}%`;
      if (elapsedRef.current >= duration) {
        if (timerRef.current) clearInterval(timerRef.current);
        onComplete();
      }
    }, step);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current, paused, duration, onComplete]);

  return (
    <div className="flex gap-[3px]">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.12] backdrop-blur-sm"
        >
          {i < current && (
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-story-accent to-story-accent-warm shadow-[0_0_6px_rgba(48,215,171,0.5)]" />
          )}
          {i === current && (
            <div
              ref={progressRef}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-story-accent to-story-accent-warm shadow-[0_0_8px_rgba(48,215,171,0.6)] transition-[width] duration-[50ms] ease-linear"
              style={{ width: '0%' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
