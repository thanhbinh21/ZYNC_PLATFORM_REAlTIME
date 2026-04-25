'use client';

import { useCallback, useRef, useState } from 'react';
import type { VolumeSliderProps } from '../stories.types';

export function VolumeSlider({ volume, muted, onChange, onMuteToggle }: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateVolume = useCallback(
    (clientY: number) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const y = rect.bottom - clientY;
      const pct = Math.max(0, Math.min(1, y / rect.height));
      onChange(pct);
    },
    [onChange],
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    updateVolume(e.clientY);

    const handleMove = (ev: MouseEvent) => updateVolume(ev.clientY);
    const handleUp = () => {
      setIsDragging(false);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    updateVolume(e.touches[0].clientY);

    const handleMove = (ev: TouchEvent) => {
      ev.preventDefault();
      updateVolume(ev.touches[0].clientY);
    };
    const handleEnd = () => {
      setIsDragging(false);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  const displayVol = muted ? 0 : volume;
  const fillHeight = `${displayVol * 100}%`;

  return (
    <div
      className="story-volume-slider animate-story-volume-slide"
      onClick={(e) => e.stopPropagation()}
      role="group"
      aria-label="Điều chỉnh âm lượng"
    >
      {/* Track */}
      <div
        ref={trackRef}
        className="story-volume-track"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        role="slider"
        aria-label="Âm lượng"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(displayVol * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            onChange(Math.min(1, volume + 0.1));
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            onChange(Math.max(0, volume - 0.1));
          }
        }}
      >
        {/* Fill */}
        <div className="story-volume-fill" style={{ height: fillHeight }} />
        {/* Thumb */}
        <div
          className={[
            'story-volume-thumb',
            isDragging ? 'scale-125' : '',
          ].join(' ')}
          style={{ bottom: fillHeight }}
        />
      </div>

      {/* Mute toggle */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onMuteToggle();
        }}
        aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        className="inline-flex h-6 w-6 items-center justify-center rounded-full text-white/60 transition-all duration-200 hover:text-white active:scale-90"
      >
        {muted || displayVol === 0 ? (
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path d="M6.717 3.55A.5.5 0 017 4v8a.5.5 0 01-.812.39L3.825 10.5H1.5A.5.5 0 011 10V6a.5.5 0 01.5-.5h2.325l2.363-1.89a.5.5 0 01.529-.06z" />
            <path d="M10.707 5.293a1 1 0 010 1.414L9.414 8l1.293 1.293a1 1 0 01-1.414 1.414L8 9.414l-1.293 1.293a1 1 0 01-1.414-1.414L6.586 8 5.293 6.707a1 1 0 011.414-1.414L8 6.586l1.293-1.293a1 1 0 011.414 0z" />
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
            <path d="M6.717 3.55A.5.5 0 017 4v8a.5.5 0 01-.812.39L3.825 10.5H1.5A.5.5 0 011 10V6a.5.5 0 01.5-.5h2.325l2.363-1.89a.5.5 0 01.529-.06zM11.596 8.697l-1.293 1.293 1.414 1.414 1.293-1.293-1.414-1.414z" />
            <path d="M9.049 5.951c.767.767 1.201 1.808 1.201 2.893 0 1.085-.434 2.126-1.201 2.893l1.06 1.06A5.588 5.588 0 0011.75 8.844c0-1.478-.585-2.896-1.64-3.953l-1.06 1.06z" />
            <path d="M10.695 4.305A7.032 7.032 0 0113.25 8.844a7.032 7.032 0 01-2.055 4.539l1.06 1.06A8.532 8.532 0 0014.75 8.844a8.532 8.532 0 00-2.495-5.599l-1.06 1.06z" />
          </svg>
        )}
      </button>
    </div>
  );
}
