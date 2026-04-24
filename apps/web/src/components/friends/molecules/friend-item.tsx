import type { FriendUser } from '@/services/friends';
import { FriendsActionButton } from '../atoms/friends-action-button';
import { FriendsAvatar } from '../atoms/friends-avatar';

interface FriendItemProps {
  friend: FriendUser;
  onUnfriend: (friendId: string) => Promise<void>;
  onBlock: (userId: string) => Promise<void>;
  isLoading: boolean;
}

export function FriendItem({ friend, onUnfriend, onBlock, isLoading }: FriendItemProps) {
  return (
    <article className="rounded-[1.4rem] border border-border bg-white/70 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <FriendsAvatar name={friend.displayName} />
          <div>
            <p className="font-ui-title text-base text-text-primary">{friend.displayName}</p>
            {friend.bio ? <p className="font-ui-content text-sm text-text-secondary">{friend.bio}</p> : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <FriendsActionButton
            label="Huy ket ban"
            variant="neutral"
            disabled={isLoading}
            onClick={() => {
              void onUnfriend(friend.id);
            }}
          />
          <FriendsActionButton
            label="Chan"
            variant="danger"
            disabled={isLoading}
            onClick={() => {
              void onBlock(friend.id);
            }}
          />
        </div>
      </div>
    </article>
  );
}
