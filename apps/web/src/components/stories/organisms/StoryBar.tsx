import { StoryAvatar } from '../atoms/StoryAvatar';
import { getInitials } from '../utils';
import type { StoryBarProps } from '../stories.types';

export function StoryBar({ feed, myStories, currentUserId, currentUserName, onViewStory, onViewMyStory, onCreateStory }: StoryBarProps) {
  const hasMyStory = myStories.length > 0;

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <div className="relative flex shrink-0 flex-col items-center gap-1">
        <StoryAvatar
          initials={currentUserName ? getInitials(currentUserName) : ''}
          seen={false}
          isOwner={!hasMyStory}
          size="md"
          onClick={hasMyStory ? onViewMyStory : onCreateStory}
        />
        {hasMyStory && (
          <button
            type="button"
            onClick={onCreateStory}
            aria-label="Tạo story mới"
            className="absolute -bottom-0.5 -right-0.5 z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#30d7ab] text-[0.65rem] font-bold text-[#033026] ring-2 ring-[#062920]"
          >
            +
          </button>
        )}
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
