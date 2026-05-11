import type { FriendUser } from '@/services/friends';
import { MessageSquare, MoreHorizontal, UserMinus, UserX } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { FriendsAvatar } from '../atoms/friends-avatar';
import { FriendsStatusBadge } from '../atoms/friends-status-badge';

interface FriendCardProps {
  friend: FriendUser;
  onUnfriend: (friendId: string) => Promise<void>;
  onBlock: (userId: string) => Promise<void>;
  isLoading: boolean;
  onMessage?: (friendId: string) => void;
}

export function FriendCard({ friend, onUnfriend, onBlock, isLoading, onMessage }: FriendCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMenu]);

  const handleUnfriend = async () => {
    setShowMenu(false);
    await onUnfriend(friend.id);
  };

  const handleBlock = async () => {
    setShowMenu(false);
    await onBlock(friend.id);
  };

  const handleMessage = () => {
    setShowMenu(false);
    onMessage?.(friend.id);
  };

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-border bg-[var(--surface-card)] p-4 transition-all duration-300 hover:border-[var(--accent)]/30 hover:shadow-[0_8px_30px_-12px_rgba(15,157,142,0.15)]">
      {/* Gradient accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex flex-col gap-4">
        {/* Header: Avatar + Info */}
        <div className="flex items-start gap-3">
          <div className="relative">
            <FriendsAvatar name={friend.displayName} avatarUrl={friend.avatarUrl} size="lg" />
            <div className="absolute -bottom-0.5 -right-0.5">
              <FriendsStatusBadge status={friend.status} size="sm" />
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-1">
            <h3 className="font-ui-title text-base text-[var(--text-primary)] truncate">
              {friend.displayName}
            </h3>
            {friend.username && (
              <p className="font-ui-meta text-xs text-[var(--text-tertiary)] truncate">
                @{friend.username}
              </p>
            )}
            {friend.bio && (
              <p className="font-ui-content mt-1 text-xs text-[var(--text-secondary)] line-clamp-2">
                {friend.bio}
              </p>
            )}
          </div>

          {/* Menu Button */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label="Tùy chọn"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMenu && (
              <div className="zync-glass-panel-strong absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl p-1">
                {onMessage && (
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={isLoading}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Nhắn tin
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUnfriend}
                  disabled={isLoading}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-amber-600"
                >
                  <UserMinus className="h-4 w-4" />
                  Hủy kết bạn
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={isLoading}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-[var(--danger-bg)]"
                >
                  <UserX className="h-4 w-4" />
                  Chặn người dùng
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMessage?.(friend.id)}
            disabled={isLoading}
            className="zync-soft-button flex flex-1 items-center justify-center gap-2 py-2.5 text-sm"
          >
            <MessageSquare className="h-4 w-4" />
            Nhắn tin
          </button>
        </div>
      </div>
    </article>
  );
}
