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
    <article className="rounded-xl border border-[#1a654f] bg-[#0b4738]/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <FriendsAvatar name={friend.displayName} />
          <div>
            <p className="font-ui-title text-base text-[#d7f2e8]">{friend.displayName}</p>
            {friend.bio ? <p className="font-ui-meta text-sm text-[#90b8ab]">{friend.bio}</p> : null}
          </div>
        </div>

        <div className="flex gap-2">
          <FriendsActionButton
            label="Hủy kết bạn"
            variant="neutral"
            disabled={isLoading}
            onClick={() => {
              void onUnfriend(friend.id);
            }}
          />
          <FriendsActionButton
            label="Chặn"
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
