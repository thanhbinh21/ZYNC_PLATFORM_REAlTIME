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

  return (
    <div className="flex items-center gap-2 rounded-full bg-black/40 px-4 py-2 backdrop-blur-md">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Trả lời story..."
        disabled={disabled}
        className="font-ui-content min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || disabled}
        className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${
          text.trim() ? 'bg-[#30d7ab] text-[#033026]' : 'bg-white/10 text-white/40'
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M3.105 3.289a.75.75 0 01.814-.097l13 6.5a.75.75 0 010 1.316l-13 6.5a.75.75 0 01-1.05-.905L5.31 10 2.87 3.384a.75.75 0 01.235-.095zm3.097 7.461l-1.77 4.857L14.5 10.5H6.202zM6.202 9.5H14.5L4.432 4.393 6.202 9.5z" />
        </svg>
      </button>
    </div>
  );
}
