import type { StoryCtaButtonProps } from '../stories.types';

export function StoryCtaButton({ label, url }: StoryCtaButtonProps) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="story-cta-button animate-story-cta-bounce story-focus-ring"
      aria-label={label}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Chevron icon */}
      <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 text-story-accent">
        <path
          fillRule="evenodd"
          d="M5.22 14.78a.75.75 0 001.06 0l7.22-7.22v5.69a.75.75 0 001.5 0v-7.5a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h5.69l-7.22 7.22a.75.75 0 000 1.06z"
          clipRule="evenodd"
        />
      </svg>
      <span>{label}</span>
    </a>
  );
}
