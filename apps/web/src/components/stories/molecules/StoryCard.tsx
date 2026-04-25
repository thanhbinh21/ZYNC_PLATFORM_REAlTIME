import { StoryAvatar } from '../atoms/StoryAvatar';
import type { StoryCardProps } from '../stories.types';

export function StoryCard({ user, latestStory, seen, onClick }: StoryCardProps) {
  const hasThumbnail = latestStory.mediaType !== 'text' && latestStory.mediaUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Xem story của ${user.displayName}${seen ? '' : ' (mới)'}`}
      className={[
        'story-card-glow story-focus-ring group relative flex h-56 w-[8.5rem] shrink-0 flex-col overflow-hidden rounded-2xl border transition-all duration-400 ease-out',
        'hover:-translate-y-1.5 hover:shadow-[0_16px_48px_-8px_rgba(48,215,171,0.2)]',
        seen
          ? 'border-story-border/15 bg-story-card/70'
          : 'border-story-border/30 bg-story-card hover:border-story-accent/25',
      ].join(' ')}
    >
      {/* Background */}
      {hasThumbnail ? (
        <img
          src={latestStory.mediaUrl}
          alt={user.displayName}
          loading="lazy"
          className={[
            'absolute inset-0 h-full w-full object-cover transition-all duration-700 ease-out group-hover:scale-110',
            seen ? 'opacity-40 grayscale-[0.15]' : 'opacity-60 group-hover:opacity-80',
          ].join(' ')}
        />
      ) : (
        <div
          className={[
            'absolute inset-0 transition-all duration-700 ease-out group-hover:scale-110',
            seen ? 'opacity-70' : '',
          ].join(' ')}
          style={{ backgroundColor: latestStory.backgroundColor || '#0d3a30' }}
        />
      )}

      {/* Top gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 bg-gradient-to-b from-black/60 via-black/25 to-transparent" />

      {/* Bottom gradient overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-28 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />

      {/* Glass shimmer on hover */}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-br from-white/[0.06] via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

      {/* Unseen indicator badge */}
      {!seen && (
        <div className="absolute right-2 top-2 z-[4] inline-flex h-2 w-2 rounded-full bg-story-accent shadow-[0_0_8px_rgba(48,215,171,0.6)] animate-story-dot-pulse" />
      )}

      {/* Content */}
      <div className="relative z-[3] flex flex-1 flex-col items-center justify-between p-3">
        {/* Avatar */}
        <div className="mt-1 transition-transform duration-400 ease-out group-hover:scale-110">
          <StoryAvatar
            initials={user.initials}
            avatarUrl={user.avatarUrl}
            seen={seen}
            size="sm"
            dimmed={seen}
          />
        </div>

        {/* Text preview for text stories */}
        {latestStory.mediaType === 'text' && latestStory.content && (
          <p className={[
            'line-clamp-3 px-1 text-center text-[0.65rem] leading-tight drop-shadow-[0_1px_4px_rgba(0,0,0,0.5)]',
            seen ? 'text-white/60' : 'text-white/80',
          ].join(' ')}>
            {latestStory.content}
          </p>
        )}

        {/* Username */}
        <p className={[
          'mt-auto w-full truncate text-center text-[0.7rem] font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)] transition-colors duration-200',
          seen ? 'text-white/60' : 'text-white/90 group-hover:text-white',
        ].join(' ')}>
          {user.displayName}
        </p>
      </div>

      {/* Hover glow ring */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-inset ring-story-accent/25 transition-opacity duration-400 group-hover:opacity-100" />
    </button>
  );
}
