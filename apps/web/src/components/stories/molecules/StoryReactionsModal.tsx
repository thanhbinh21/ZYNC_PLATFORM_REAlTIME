'use client';

import { useEffect } from 'react';
import { REACTION_TYPES, type StoryReactionsModalProps } from '../stories.types';

export function StoryReactionsModal({ open, reactions, onClose }: StoryReactionsModalProps) {
  // Lock body scroll
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.classList.add('story-viewer-open');
    document.body.style.top = `-${scrollY}px`;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.classList.remove('story-viewer-open');
      document.body.style.top = '';
      window.scrollTo(0, scrollY);
      window.removeEventListener('keydown', handleKey);
    };
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
      className="story-modal-mobile bg-black/70 backdrop-blur-xl animate-story-backdrop"
      onClick={handleBackdropClick}
    >
      <div className="story-modal-mobile-content animate-story-modal scrollbar-hide">
        {/* Drag handle on mobile */}
        <div className="story-bottom-sheet-handle sm:hidden" />

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-story-border/30 bg-story-surface/95 px-4 py-3 backdrop-blur-xl sm:px-6 sm:py-4">
          <h2 className="text-base font-semibold tracking-tight text-story-text sm:text-lg">Reactions</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-story-card text-story-muted transition-all duration-200 active:scale-90 sm:h-8 sm:w-8"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-6 sm:pt-4 story-safe-bottom">
          {grouped.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-8 text-center animate-story-fade-up sm:py-10">
              <span className="text-4xl">😶</span>
              <p className="text-sm text-story-muted">Chưa có reaction nào.</p>
            </div>
          )}

          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1 scrollbar-hide sm:max-h-72 sm:space-y-5">
            {grouped.map(({ emoji, entries }, gIdx) => (
              <div key={emoji} className="animate-story-fade-up" style={{ animationDelay: `${gIdx * 70}ms` }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{emoji}</span>
                  <span className="rounded-full bg-story-accent/10 px-2.5 py-0.5 text-xs font-semibold text-story-accent shadow-[0_0_8px_rgba(48,215,171,0.1)]">
                    {entries.length}
                  </span>
                </div>
                <div className="mt-2 space-y-1.5 sm:mt-2.5">
                  {entries.map((r) => (
                    <div
                      key={r.userId}
                      className="flex items-center gap-3 rounded-xl border border-story-border/25 bg-story-card/40 px-3 py-2 transition-all duration-250 active:bg-story-card/60 sm:px-3.5 sm:py-2.5"
                    >
                      {r.avatarUrl ? (
                        <img src={r.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover ring-1 ring-white/[0.06] sm:h-9 sm:w-9" />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-story-border to-story-card text-[0.65rem] font-semibold text-story-text ring-1 ring-white/[0.06] sm:h-9 sm:w-9 sm:text-xs">
                          {r.displayName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-[0.8rem] font-medium text-white/80 sm:text-sm">{r.displayName}</span>
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
