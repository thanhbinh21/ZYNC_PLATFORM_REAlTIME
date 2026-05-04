import type { FriendsScreenProps } from '../friends.types';
import { Bell, Search, Users, UserPlus, Clock, CheckCircle2, X, UserX } from 'lucide-react';
import { FriendItem } from '../molecules/friend-item';
import { RequestItem } from '../molecules/request-item';
import { SearchResultItem } from '../molecules/search-result-item';

export function FriendsScreen({
  friends,
  incomingRequests,
  outgoingRequests,
  searchKeyword,
  searchResults,
  pendingTotal,
  nextCursor,
  isLoading,
  infoMessage,
  errorMessage,
  onSearchKeywordChange,
  onSearch,
  onLoadMoreFriends,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onUnfriend,
  onBlock,
  onUnblock,
}: FriendsScreenProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-border-light px-4 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-ui-meta text-[0.7rem] uppercase tracking-[0.18em] text-text-tertiary">Quản lý</p>
            <h1 className="font-ui-title mt-1 text-2xl text-text-primary">Bạn bè</h1>
            <p className="font-ui-content mt-1 text-sm text-text-secondary">
              {friends.length} kết nối · {pendingTotal} lời mời chờ
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {pendingTotal > 0 && (
              <div className="relative">
                <Bell className="h-5 w-5 text-accent" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {pendingTotal > 9 ? '9+' : pendingTotal}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-5">
          {/* Pending Requests */}
          {incomingRequests.length > 0 || outgoingRequests.length > 0 ? (
            <section className="zync-soft-card rounded-[1.8rem] p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-ui-title text-lg text-text-primary">Lời mời kết bạn</h2>
                {pendingTotal > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="font-ui-meta text-[10px] uppercase tracking-wider text-accent-strong">
                      {pendingTotal} đang chờ
                    </span>
                  </span>
                )}
              </div>

              {incomingRequests.length > 0 && (
                <div className="space-y-3">
                  <p className="font-ui-meta text-[0.7rem] uppercase tracking-[0.18em] text-text-tertiary">
                    Nhận được
                  </p>
                  <div className="space-y-2">
                    {incomingRequests.map((item) => (
                      <RequestItem
                        key={item.requestId}
                        item={item}
                        type="incoming"
                        isLoading={isLoading}
                        onAcceptRequest={onAcceptRequest}
                        onRejectRequest={onRejectRequest}
                        onUnblock={onUnblock}
                      />
                    ))}
                  </div>
                </div>
              )}

              {outgoingRequests.length > 0 && (
                <div className={`space-y-3 ${incomingRequests.length > 0 ? 'mt-5' : ''}`}>
                  <p className="font-ui-meta text-[0.7rem] uppercase tracking-[0.18em] text-text-tertiary">
                    Đã gửi
                  </p>
                  <div className="space-y-2">
                    {outgoingRequests.map((item) => (
                      <RequestItem
                        key={item.requestId}
                        item={item}
                        type="outgoing"
                        isLoading={isLoading}
                        onAcceptRequest={onAcceptRequest}
                        onRejectRequest={onRejectRequest}
                        onUnblock={onUnblock}
                      />
                    ))}
                  </div>
                </div>
              )}
            </section>
          ) : (
            <section className="zync-soft-card-muted rounded-[1.8rem] p-6 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-bg-hover">
                <UserPlus className="h-5 w-5 text-text-tertiary" />
              </div>
              <p className="font-ui-title mt-3 text-sm text-text-primary">Không có lời mời nào</p>
              <p className="font-ui-content mt-1 text-xs text-text-secondary">
                Tìm người quen để kết nối
              </p>
            </section>
          )}

          {/* Search */}
          <section className="zync-soft-card rounded-[1.8rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-ui-title text-lg text-text-primary">Tìm bạn</h2>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
                <input
                  value={searchKeyword}
                  onChange={(event) => onSearchKeywordChange(event.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') void onSearch(); }}
                  placeholder="Nhập @username hoặc email"
                  className="zync-soft-input w-full pl-9"
                />
              </div>
              <button
                type="button"
                onClick={() => { void onSearch(); }}
                disabled={isLoading || !searchKeyword.trim()}
                className="zync-soft-button flex h-11 shrink-0 items-center gap-2 px-5 text-sm disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Tìm kiếm</span>
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map((user) => (
                  <SearchResultItem
                    key={user.id}
                    user={user}
                    isLoading={isLoading}
                    onSendRequest={onSendRequest}
                  />
                ))}
              </div>
            )}

            {searchKeyword.trim() && searchResults.length === 0 && !isLoading && (
              <div className="mt-4 flex flex-col items-center gap-2 py-6 text-center">
                <UserX className="h-8 w-8 text-text-tertiary" />
                <p className="font-ui-content text-sm text-text-secondary">
                  Không tìm thấy người dùng phù hợp
                </p>
              </div>
            )}
          </section>

          {/* Friends List */}
          <section className="zync-soft-card rounded-[1.8rem] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" />
                <h2 className="font-ui-title text-lg text-text-primary">Danh sách bạn bè</h2>
                <span className="font-ui-meta rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-secondary">
                  {friends.length}
                </span>
              </div>
            </div>

            {friends.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-bg-hover">
                  <Users className="h-6 w-6 text-text-tertiary" />
                </div>
                <div>
                  <p className="font-ui-title text-sm text-text-primary">Chưa có bạn bè nào</p>
                  <p className="font-ui-content mt-1 text-xs text-text-secondary">
                    Tìm kiếm và kết nối với mọi người
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <FriendItem
                    key={friend.id}
                    friend={friend}
                    onUnfriend={onUnfriend}
                    onBlock={onBlock}
                    isLoading={isLoading}
                  />
                ))}
              </div>
            )}

            {nextCursor && friends.length > 0 && (
              <button
                type="button"
                onClick={() => { void onLoadMoreFriends(); }}
                disabled={isLoading}
                className="zync-soft-button-secondary mt-4 flex w-full items-center justify-center gap-2 py-2.5 text-sm"
              >
                <Clock className="h-4 w-4" />
                Tải thêm bạn bè
              </button>
            )}
          </section>

          {/* Feedback messages */}
          {infoMessage && (
            <div className="flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-accent" />
              <p className="font-ui-content text-sm text-accent-strong">{infoMessage}</p>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3">
              <X className="h-4 w-4 shrink-0 text-red-400" />
              <p className="font-ui-content text-sm text-red-400">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
