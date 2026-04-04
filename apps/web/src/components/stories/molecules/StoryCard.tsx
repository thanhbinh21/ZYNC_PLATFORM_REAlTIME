import { StoryAvatar } from '../atoms/StoryAvatar';
import type { StoryCardProps } from '../stories.types';

export function StoryCard({ user, latestStory, seen, onClick }: StoryCardProps) {
  const hasThumbnail = latestStory.mediaType !== 'text' && latestStory.mediaUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-52 w-32 shrink-0 flex-col overflow-hidden rounded-2xl border border-story-border/40 bg-story-card transition-all duration-300 ease-out hover:-translate-y-1 hover:border-story-accent/30 hover:shadow-[0_12px_40px_-8px_rgba(48,215,171,0.2)]"
    >
      {/* Background */}
      {hasThumbnail ? (
        <img
          src={latestStory.mediaUrl}
          alt={user.displayName}
          className="absolute inset-0 h-full w-full object-cover opacity-60 transition-all duration-500 group-hover:scale-105 group-hover:opacity-80"
        />
      ) : (
        <div
          className="absolute inset-0 transition-all duration-500 group-hover:scale-105"
          style={{ backgroundColor: latestStory.backgroundColor || '#0d3a30' }}
        />
      )}

      {/* Top gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-20 bg-gradient-to-b from-black/50 to-transparent" />
      {/* Bottom gradient */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative z-[2] flex flex-1 flex-col items-center justify-between p-2.5">
        <div className="mt-1 transition-transform duration-300 group-hover:scale-105">
          <StoryAvatar
            initials={user.initials}
            avatarUrl={user.avatarUrl}
            seen={seen}
            size="sm"
          />
        </div>

        {latestStory.mediaType === 'text' && latestStory.content && (
          <p className="line-clamp-3 text-center text-[0.65rem] leading-tight text-white/80 drop-shadow-md">
            {latestStory.content}
          </p>
        )}

        <p className="mt-auto truncate text-[0.7rem] font-medium text-white/90 drop-shadow transition-colors duration-200 group-hover:text-white">
          {user.displayName}
        </p>
      </div>

      {/* Hover glow edge */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-story-accent/20 transition-opacity duration-300 group-hover:opacity-100" />
    </button>
  );
}
