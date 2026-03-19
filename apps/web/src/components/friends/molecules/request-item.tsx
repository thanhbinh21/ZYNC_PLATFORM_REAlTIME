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
    <article className="rounded-xl border border-[#1a654f] bg-[#0b4738]/65 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <FriendsAvatar name={item.displayName} />
          <div>
            <p className="font-ui-title text-base text-[#d7f2e8]">{item.displayName}</p>
            <p className="font-ui-meta text-xs text-[#90b8ab]">{dateLabel}</p>
          </div>
        </div>

        {type === 'incoming' ? (
          <div className="flex gap-2">
            <FriendsActionButton
              label="Chấp nhận"
              variant="primary"
              disabled={isLoading}
              onClick={() => {
                void onAcceptRequest(item.requestId);
              }}
            />
            <FriendsActionButton
              label="Từ chối"
              variant="danger"
              disabled={isLoading}
              onClick={() => {
                void onRejectRequest(item.requestId);
              }}
            />
          </div>
        ) : (
          <FriendsActionButton
            label="Bỏ chặn"
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
