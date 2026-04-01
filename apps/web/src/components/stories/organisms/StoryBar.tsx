import { StoryAvatar } from '../atoms/StoryAvatar';
import type { StoryBarProps } from '../stories.types';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export function StoryBar({ feed, myStories, currentUserId, onViewStory, onCreateStory }: StoryBarProps) {
  const hasMyStory = myStories.length > 0;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <div className="flex shrink-0 flex-col items-center gap-1">
        <StoryAvatar
          initials=""
          seen={false}
          isOwner
          size="md"
          onClick={onCreateStory}
        />
        <span className="font-ui-meta text-[0.66rem] text-[#b5d8cc]">
          {hasMyStory ? 'Story của tôi' : 'Tạo Story'}
        </span>
      </div>

      {feed.map((group, idx) => {
        if (group.userId === currentUserId) return null;
        const allSeen = group.stories.every((s) =>
          s.viewerIds.includes(currentUserId),
        );
        return (
          <div key={group.userId} className="flex shrink-0 flex-col items-center gap-1">
            <StoryAvatar
              initials={getInitials(group.displayName)}
              avatarUrl={group.avatarUrl}
              seen={allSeen}
              size="md"
              onClick={() => onViewStory(idx)}
            />
            <span className="font-ui-meta max-w-[64px] truncate text-[0.66rem] text-[#b5d8cc]">
              {group.displayName}
            </span>
          </div>
        );
      })}
    </div>
  );
}
