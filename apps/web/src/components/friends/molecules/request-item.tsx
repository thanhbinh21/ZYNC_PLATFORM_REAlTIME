import type { FriendRequestItem } from '@/services/friends';
import { FriendsActionButton } from '../atoms/friends-action-button';
import { FriendsAvatar } from '../atoms/friends-avatar';

interface RequestItemProps {
  item: FriendRequestItem;
  type: 'incoming' | 'outgoing';
  isLoading: boolean;
  onAcceptRequest: (requestId: string) => Promise<void>;
  onRejectRequest: (requestId: string) => Promise<void>;
  onUnblock: (userId: string) => Promise<void>;
}

export function RequestItem({
  item,
  type,
  isLoading,
  onAcceptRequest,
  onRejectRequest,
  onUnblock,
}: RequestItemProps) {
  const dateLabel = new Date(item.createdAt).toLocaleString('vi-VN');

  return (
    <article className="rounded-[1.4rem] border border-border bg-white/70 p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <FriendsAvatar name={item.displayName} />
          <div>
            <p className="font-ui-title text-base text-text-primary">{item.displayName}</p>
            <p className="font-ui-meta text-xs text-text-tertiary">{dateLabel}</p>
          </div>
        </div>

        {type === 'incoming' ? (
          <div className="flex flex-wrap gap-2">
            <FriendsActionButton
              label="Chap nhan"
              variant="primary"
              disabled={isLoading}
              onClick={() => {
                void onAcceptRequest(item.requestId);
              }}
            />
            <FriendsActionButton
              label="Tu choi"
              variant="danger"
              disabled={isLoading}
              onClick={() => {
                void onRejectRequest(item.requestId);
              }}
            />
          </div>
        ) : (
          <FriendsActionButton
            label="Bo chan"
            variant="neutral"
            disabled={isLoading}
            onClick={() => {
              void onUnblock(item.userId);
            }}
          />
        )}
      </div>
    </article>
  );
}
