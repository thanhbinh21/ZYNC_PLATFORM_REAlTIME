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
    <article className="rounded-[1.4rem] border border-border bg-[var(--surface-glass)] p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <FriendsAvatar name={user.displayName} />
          <div>
            <p className="font-ui-title text-base text-text-primary">{user.displayName}</p>
            {user.username ? <p className="font-ui-meta text-xs text-text-tertiary">@{user.username}</p> : null}
            {user.email ? <p className="font-ui-meta text-xs text-text-tertiary">{user.email}</p> : null}
            {user.bio ? <p className="font-ui-content text-xs text-text-secondary">{user.bio}</p> : null}
          </div>
        </div>
        <FriendsActionButton
          label="Ket ban"
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
