'use client';

import { useEffect } from 'react';
import { REACTION_TYPES, type StoryReactionsModalProps } from '../stories.types';

export function StoryReactionsModal({ open, reactions, onClose }: StoryReactionsModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const grouped = REACTION_TYPES.map((emoji) => ({
    emoji,
    entries: reactions.filter((r) => r.type === emoji),
  })).filter((g) => g.entries.length > 0);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={handleBackdropClick}
    >
      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-[#1a5140]/80 bg-[#062920] shadow-[0_25px_60px_-12px_rgba(0,0,0,0.6)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a5140]/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-[#e4fff5]">Reactions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0d3228] text-[#87ac9f] transition hover:bg-[#14463a] hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="text-3xl">😶</span>
              <p className="text-sm text-[#739f91]">Chưa có reaction nào.</p>
            </div>
          )}

          <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
            {grouped.map(({ emoji, entries }) => (
              <div key={emoji}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{emoji}</span>
                  <span className="rounded-full bg-[#0d3228] px-2 py-0.5 text-xs font-medium text-[#8cc4b3]">
                    {entries.length}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {entries.map((r) => (
                    <div key={r.userId} className="flex items-center gap-3 rounded-xl border border-[#1a5140]/50 bg-[#0b3228]/50 px-3 py-2.5 transition hover:bg-[#0d3a30]/50">
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#1a5140] to-[#0d3228] text-xs font-semibold text-[#e2fff5]">
                          {r.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-sm text-[#cdece0]">{r.displayName}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
