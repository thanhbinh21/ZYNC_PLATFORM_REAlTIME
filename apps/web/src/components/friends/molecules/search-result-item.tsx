import type { FriendUser } from '@/services/friends';
import { FriendsActionButton } from '../atoms/friends-action-button';
import { FriendsAvatar } from '../atoms/friends-avatar';

interface SearchResultItemProps {
  user: FriendUser;
  isLoading: boolean;
  onSendRequest: (toUserId: string) => Promise<void>;
}

export function SearchResultItem({ user, isLoading, onSendRequest }: SearchResultItemProps) {
  return (
    <article className="rounded-xl border border-[#1a654f] bg-[#0b4738]/65 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FriendsAvatar name={user.displayName} />
          <div>
            <p className="font-ui-title text-base text-[#d7f2e8]">{user.displayName}</p>
            {user.username ? <p className="font-ui-meta text-xs text-[#90b8ab]">@{user.username}</p> : null}
            {user.email ? <p className="font-ui-meta text-xs text-[#78a798]">{user.email}</p> : null}
            {user.bio ? <p className="font-ui-meta text-xs text-[#90b8ab]">{user.bio}</p> : null}
          </div>
        </div>
        <FriendsActionButton
          label="Kết bạn"
          variant="primary"
          disabled={isLoading}
          onClick={() => {
            void onSendRequest(user.id);
          }}
        />
      </div>
    </article>
  );
}
