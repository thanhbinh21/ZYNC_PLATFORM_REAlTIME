'use client';

import React, { useCallback, useState, useEffect } from 'react';
import {
  X,
  MessageCircle,
  UserPlus,
  UserMinus,
  Loader2,
  Check,
} from 'lucide-react';
import type { UserProfileSummary } from '@/hooks/use-navigation-flow';

interface UserProfileModalProps {
  visible: boolean;
  userId: string | null;
  currentUserId?: string;
  user?: UserProfileSummary;
  loading?: boolean;
  onClose: () => void;
  onSendMessage?: (userId: string) => void;
  onSendFriendRequest?: (userId: string) => Promise<void>;
}

function formatYear(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).getFullYear().toString();
  } catch {
    return '';
  }
}

export function UserProfileModal({
  visible,
  userId,
  currentUserId,
  user,
  loading,
  onClose,
  onSendMessage,
  onSendFriendRequest,
}: UserProfileModalProps) {
  const [friendRequestLoading, setFriendRequestLoading] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  // Reset state when modal closes or user changes
  useEffect(() => {
    if (!visible) {
      setFriendRequestSent(false);
      setFriendRequestLoading(false);
    }
  }, [visible]);

  const handleSendMessage = useCallback(() => {
    if (userId && onSendMessage) {
      onSendMessage(userId);
    }
  }, [userId, onSendMessage]);

  const handleSendFriendRequest = useCallback(async () => {
    if (!userId || !onSendFriendRequest) return;
    setFriendRequestLoading(true);
    try {
      await onSendFriendRequest(userId);
      setFriendRequestSent(true);
    } catch {
      // Error handled by parent
    } finally {
      setFriendRequestLoading(false);
    }
  }, [userId, onSendFriendRequest]);

  const isMe = userId === currentUserId;
  const initials = (user?.displayName ?? '??').slice(0, 2).toUpperCase();

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="zync-soft-card zync-soft-card-elevated relative w-full max-w-sm rounded-[1.8rem] p-6 shadow-xl"
        style={{ animation: 'modal-pop-in 0.25s ease-out' }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="zync-soft-button-ghost absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full p-0 text-text-secondary"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        )}

        {/* Content */}
        {!loading && user && (
          <div className="flex flex-col items-center">
            {/* Avatar */}
            <div
              className="mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-xl font-semibold"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent-primary)' }}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            {/* Name */}
            <h2 className="font-ui-title text-xl text-text-primary">{user.displayName}</h2>
            {user.username && (
              <p className="font-ui-meta mt-0.5 text-sm text-text-tertiary">@{user.username}</p>
            )}
            {user.bio && (
              <p className="font-ui-content mt-3 text-center text-sm leading-relaxed text-text-secondary">
                {user.bio}
              </p>
            )}

            {/* Stats */}
            <div className="mt-5 flex items-center gap-6">
              <div className="flex flex-col items-center">
                <span className="font-ui-title text-lg text-text-primary">
                  {user.friendCount ?? 0}
                </span>
                <span className="font-ui-meta text-xs text-text-tertiary">Bạn bè</span>
              </div>
              {user.mutualFriends !== undefined && !isMe && (
                <div className="flex flex-col items-center">
                  <span className="font-ui-title text-lg text-text-primary">
                    {user.mutualFriends}
                  </span>
                  <span className="font-ui-meta text-xs text-text-tertiary">Bạn chung</span>
                </div>
              )}
              {user.createdAt && (
                <div className="flex flex-col items-center">
                  <span className="font-ui-title text-lg text-text-primary">
                    {formatYear(user.createdAt)}
                  </span>
                  <span className="font-ui-meta text-xs text-text-tertiary">Tham gia</span>
                </div>
              )}
            </div>

            {/* Actions */}
            {!isMe && (
              <div className="mt-6 flex w-full flex-col gap-3">
                {/* Luôn hiển thị nút Nhắn tin */}
                <button
                  type="button"
                  onClick={handleSendMessage}
                  className="zync-soft-button flex w-full items-center justify-center gap-2 py-3 text-sm"
                >
                  <MessageCircle className="h-4 w-4" />
                  Nhắn tin
                </button>

                {!user.isFriend && (
                  friendRequestLoading ? (
                    <button
                      type="button"
                      disabled
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm"
                      style={{
                        backgroundColor: 'var(--surface-muted)',
                        color: 'var(--text-tertiary)',
                        cursor: 'not-allowed',
                      }}
                    >
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang gửi...
                    </button>
                  ) : friendRequestSent ? (
                    <button
                      type="button"
                      disabled
                      className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm"
                      style={{
                        backgroundColor: 'var(--surface-muted)',
                        color: 'var(--text-tertiary)',
                        cursor: 'not-allowed',
                      }}
                    >
                      <Check className="h-4 w-4" />
                      Đã gửi lời mời
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendFriendRequest}
                      className="zync-soft-button-secondary flex w-full items-center justify-center gap-2 py-3 text-sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      Kết bạn
                    </button>
                  )
                )}

                {user.isFriend && (
                  <button
                    type="button"
                    className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-text-tertiary transition-colors hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500"
                  >
                    <UserMinus className="h-4 w-4" />
                    Xóa bạn bè
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {!loading && !user && (
          <div className="py-8 text-center">
            <p className="font-ui-content text-sm text-text-tertiary">
              Không thể tải thông tin người dùng
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes modal-pop-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
