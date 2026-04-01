import { StoryAvatar } from '../atoms/StoryAvatar';
import type { StoryCardProps } from '../stories.types';

export function StoryCard({ user, latestStory, seen, onClick }: StoryCardProps) {
  const hasThumbnail = latestStory.mediaType !== 'text' && latestStory.mediaUrl;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex h-48 w-28 shrink-0 flex-col overflow-hidden rounded-2xl border border-[#1a5140] bg-[#0b3228] transition hover:border-[#30d7ab]/50"
    >
      {hasThumbnail ? (
        <img
          src={latestStory.mediaUrl}
          alt={user.displayName}
          className="absolute inset-0 h-full w-full object-cover opacity-70 transition group-hover:opacity-85"
        />
      ) : (
        <div
          className="absolute inset-0"
          style={{ backgroundColor: latestStory.backgroundColor || '#0d3a30' }}
        />
      )}

      <div className="relative z-10 flex flex-1 flex-col items-center justify-between p-2">
        <div className="mt-1">
          <StoryAvatar
            initials={user.initials}
            avatarUrl={user.avatarUrl}
            seen={seen}
            size="sm"
          />
        </div>

        {latestStory.mediaType === 'text' && latestStory.content && (
          <p className="line-clamp-3 text-center text-[0.65rem] leading-tight text-white/90">
            {latestStory.content}
          </p>
        )}

        <p className="font-ui-meta mt-auto text-[0.65rem] text-white/80 transition group-hover:text-white">
          {user.displayName}
        </p>
      </div>
    </button>
  );
}
