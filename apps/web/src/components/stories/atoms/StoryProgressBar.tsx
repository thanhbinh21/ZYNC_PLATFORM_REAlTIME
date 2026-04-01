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
          className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-white/20 backdrop-blur-sm"
        >
          {i < current && (
            <div className="h-full w-full rounded-full bg-[#30d7ab] shadow-[0_0_4px_rgba(48,215,171,0.5)]" />
          )}
          {i === current && (
            <div
              ref={progressRef}
              className="h-full rounded-full bg-[#30d7ab] shadow-[0_0_4px_rgba(48,215,171,0.5)] transition-[width] duration-[50ms] ease-linear"
              style={{ width: '0%' }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
