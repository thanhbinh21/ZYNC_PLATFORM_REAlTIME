'use client';

import type { FriendUser } from '@/services/friends';
import { MessageSquare, MoreHorizontal, UserMinus, UserX } from 'lucide-react';
import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { FriendsAvatar } from '../atoms/friends-avatar';
import { FriendsStatusBadge } from '../atoms/friends-status-badge';

const MENU_WIDTH_PX = 192; // w-48

interface FriendCardProps {
  friend: FriendUser;
  onUnfriend: (friendId: string) => Promise<void>;
  onBlock: (userId: string) => Promise<void>;
  isLoading: boolean;
  onMessage?: (friendId: string) => void;
}

export function FriendCard({ friend, onUnfriend, onBlock, isLoading, onMessage }: FriendCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuRect, setMenuRect] = useState<{ top: number; left: number } | null>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!showMenu || !menuTriggerRef.current) {
      setMenuRect(null);
      return;
    }
    const update = () => {
      const el = menuTriggerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const left = Math.min(
        Math.max(8, r.right - MENU_WIDTH_PX),
        window.innerWidth - MENU_WIDTH_PX - 8
      );
      setMenuRect({ top: r.bottom + 4, left });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (menuPanelRef.current?.contains(t)) return;
      if (menuTriggerRef.current?.contains(t)) return;
      setShowMenu(false);
    };

    const closeOnScroll = () => setShowMenu(false);

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', closeOnScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', closeOnScroll, true);
    };
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
    <article className="group relative overflow-visible rounded-2xl border border-border bg-[var(--surface-card)] p-4 transition-all duration-300 hover:border-[var(--accent)]/30 hover:shadow-[0_8px_30px_-12px_rgba(15,157,142,0.15)]">
      {/* Gradient accent bar */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="flex flex-col gap-4">
        {/* Header: Avatar + Info */}
        <div className="relative z-10 flex items-start gap-3">
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

          {/* Menu — panel via portal so it is not clipped by card / page overflow */}
          <div className="relative shrink-0">
            <button
              ref={menuTriggerRef}
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-tertiary)] transition-all hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              aria-label="Tùy chọn"
              aria-expanded={showMenu}
              aria-haspopup="menu"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {showMenu && menuRect && typeof document !== 'undefined' && createPortal(
              <div
                ref={menuPanelRef}
                className="zync-glass-panel-strong fixed z-[300] w-48 overflow-hidden rounded-xl bg-[var(--surface-card)]/95 p-1 shadow-2xl backdrop-blur-xl"
                style={{ top: menuRect.top, left: menuRect.left }}
                role="menu"
              >
                {onMessage && (
                  <button
                    type="button"
                    onClick={handleMessage}
                    disabled={isLoading}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--accent)]"
                    role="menuitem"
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
                  role="menuitem"
                >
                  <UserMinus className="h-4 w-4" />
                  Hủy kết bạn
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={isLoading}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-[var(--danger-bg)]"
                  role="menuitem"
                >
                  <UserX className="h-4 w-4" />
                  Chặn người dùng
                </button>
              </div>,
              document.body
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
