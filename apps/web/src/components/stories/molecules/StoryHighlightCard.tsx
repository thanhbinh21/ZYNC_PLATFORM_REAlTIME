import type { StoryHighlightCardProps } from '../stories.types';

export function StoryHighlightCard({ highlight, onClick }: StoryHighlightCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="story-highlight-card story-focus-ring"
      aria-label={`Xem highlight: ${highlight.title}`}
    >
      <div className="story-highlight-cover">
        {highlight.coverUrl ? (
          <img
            src={highlight.coverUrl}
            alt={highlight.title}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-story-card to-story-bg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 text-story-muted">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}
      </div>

      <span className="max-w-[68px] truncate text-[0.65rem] font-medium text-story-text-dim transition-colors duration-200 group-hover:text-story-text sm:text-[0.7rem]">
        {highlight.title}
      </span>
    </button>
  );
}
