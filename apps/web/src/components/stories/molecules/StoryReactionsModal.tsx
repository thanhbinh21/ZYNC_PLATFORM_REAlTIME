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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xl animate-story-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="relative mx-4 w-full max-w-sm overflow-hidden rounded-3xl border border-white/[0.06] bg-story-surface shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] animate-story-modal">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-story-border/30 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-story-text">Reactions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-story-card text-story-muted transition-all duration-200 hover:bg-story-border/50 hover:text-white"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 pt-4">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-10 text-center animate-story-fade-up">
              <span className="text-4xl">😶</span>
              <p className="text-sm text-story-muted">Chưa có reaction nào.</p>
            </div>
          )}

          <div className="max-h-72 space-y-5 overflow-y-auto pr-1 scrollbar-hide">
            {grouped.map(({ emoji, entries }, gIdx) => (
              <div key={emoji} className="animate-story-fade-up" style={{ animationDelay: `${gIdx * 80}ms` }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{emoji}</span>
                  <span className="rounded-full bg-story-accent/10 px-2.5 py-0.5 text-xs font-semibold text-story-accent">
                    {entries.length}
                  </span>
                </div>
                <div className="mt-2.5 space-y-1.5">
                  {entries.map((r) => (
                    <div
                      key={r.userId}
                      className="flex items-center gap-3 rounded-xl border border-story-border/30 bg-story-card/50 px-3.5 py-2.5 transition-all duration-200 hover:border-story-accent/20 hover:bg-story-card"
                    >
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/[0.06]" />
                      ) : (
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-story-border to-story-card text-xs font-semibold text-story-text ring-1 ring-white/[0.06]">
                          {r.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-sm font-medium text-white/80">{r.displayName}</span>
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
