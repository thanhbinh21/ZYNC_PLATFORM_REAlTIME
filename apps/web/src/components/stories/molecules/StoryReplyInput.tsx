'use client';

import { useState } from 'react';
import type { StoryReplyInputProps } from '../stories.types';

export function StoryReplyInput({ onSend, disabled }: StoryReplyInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="group/reply flex items-center gap-2 rounded-full border border-white/[0.08] bg-black/40 px-4 py-2.5 shadow-[0_4px_24px_rgba(0,0,0,0.2)] backdrop-blur-2xl transition-all duration-300 focus-within:border-story-accent/30 focus-within:bg-black/50 focus-within:shadow-[0_0_20px_rgba(48,215,171,0.1)]">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Trả lời story..."
        disabled={disabled}
        maxLength={1000}
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30 disabled:opacity-50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!hasText || disabled}
        aria-label="Gửi"
        className={[
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          'transition-all duration-300',
          hasText
            ? 'bg-gradient-to-br from-story-accent to-emerald-500 text-story-bg shadow-[0_0_12px_rgba(48,215,171,0.4)] hover:shadow-[0_0_20px_rgba(48,215,171,0.5)] hover:scale-105 active:scale-95'
            : 'bg-white/[0.06] text-white/20',
        ].join(' ')}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M3.105 3.289a.75.75 0 01.814-.097l13 6.5a.75.75 0 010 1.316l-13 6.5a.75.75 0 01-1.05-.905L5.31 10 2.87 3.384a.75.75 0 01.235-.095zm3.097 7.461l-1.77 4.857L14.5 10.5H6.202zM6.202 9.5H14.5L4.432 4.393 6.202 9.5z" />
        </svg>
      </button>
    </div>
  );
}
