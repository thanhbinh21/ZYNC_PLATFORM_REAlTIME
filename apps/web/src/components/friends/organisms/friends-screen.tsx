import type { FriendsScreenProps } from '../friends.types';
import { Bell, Search, Users } from 'lucide-react';
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
    <div className="flex h-full w-full flex-col overflow-y-auto px-4 py-5 text-text-primary sm:px-6 lg:px-8">
      <section className="w-full">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="zync-soft-kicker">Network Hub</span>
            <h1 className="font-ui-title mt-4 text-[clamp(2rem,4vw,3.1rem)] text-text-primary">Trung tam ban be</h1>
            <p className="font-ui-content mt-2 max-w-2xl text-base text-text-secondary">
              Quan ly ket noi, loi moi va danh sach ban be trong mot khong gian sang, ro va de theo doi hon.
            </p>
          </div>
        </header>

        <section className="mt-7 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="zync-soft-card zync-soft-card-elevated rounded-[1.8rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-ui-title text-xl text-text-primary">Loi moi ket ban ({pendingTotal})</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-glass)] px-3 py-1 text-xs text-text-primary">
                <Bell className="h-3.5 w-3.5 text-accent" />
                Incoming
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {incomingRequests.length === 0 ? (
                <p className="font-ui-meta text-sm text-text-tertiary">Chua co loi moi den.</p>
              ) : (
                incomingRequests.map((item) => (
                  <RequestItem
                    key={item.requestId}
                    item={item}
                    type="incoming"
                    isLoading={isLoading}
                    onAcceptRequest={onAcceptRequest}
                    onRejectRequest={onRejectRequest}
                    onUnblock={onUnblock}
                  />
                ))
              )}
            </div>

            <h3 className="font-ui-title mt-7 text-base text-text-primary">Loi moi da gui</h3>
            <div className="mt-3 space-y-3">
              {outgoingRequests.length === 0 ? (
                <p className="font-ui-meta text-sm text-text-tertiary">Ban chua gui loi moi nao.</p>
              ) : (
                outgoingRequests.map((item) => (
                  <RequestItem
                    key={item.requestId}
                    item={item}
                    type="outgoing"
                    isLoading={isLoading}
                    onAcceptRequest={onAcceptRequest}
                    onRejectRequest={onRejectRequest}
                    onUnblock={onUnblock}
                  />
                ))
              )}
            </div>
          </div>

          <div className="zync-soft-card zync-soft-card-elevated rounded-[1.8rem] p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-ui-title text-xl text-text-primary">Tim nguoi de ket ban</h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-glass)] px-3 py-1 text-xs text-text-primary">
                <Search className="h-3.5 w-3.5 text-accent" />
                Discover
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={searchKeyword}
                onChange={(event) => onSearchKeywordChange(event.target.value)}
                placeholder="Nhap @username hoac email"
                className="zync-soft-input"
              />
              <button
                type="button"
                onClick={() => {
                  void onSearch();
                }}
                disabled={isLoading}
                className="zync-soft-button h-12 px-5 text-sm"
              >
                Tim
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {searchResults.length === 0 ? (
                <p className="font-ui-meta text-sm text-text-tertiary">Chua co ket qua tim kiem.</p>
              ) : (
                searchResults.map((user) => (
                  <SearchResultItem
                    key={user.id}
                    user={user}
                    isLoading={isLoading}
                    onSendRequest={onSendRequest}
                  />
                ))
              )}
            </div>
          </div>
        </section>

        <section className="zync-soft-card mt-6 rounded-[1.8rem] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-ui-title text-xl text-text-primary">Danh sach ban be ({friends.length})</h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-[var(--surface-glass)] px-3 py-1 text-xs text-text-primary">
              <Users className="h-3.5 w-3.5 text-accent" />
              Trusted Circle
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {friends.length === 0 ? (
              <p className="font-ui-meta text-sm text-text-tertiary">Ban chua co ban be nao.</p>
            ) : (
              friends.map((friend) => (
                <FriendItem
                  key={friend.id}
                  friend={friend}
                  onUnfriend={onUnfriend}
                  onBlock={onBlock}
                  isLoading={isLoading}
                />
              ))
            )}
          </div>

          {nextCursor ? (
            <button
              type="button"
              onClick={() => {
                void onLoadMoreFriends();
              }}
              disabled={isLoading}
              className="zync-soft-button-secondary mt-5 h-10 px-4 text-sm"
            >
              Tai them ban be
            </button>
          ) : null}
        </section>

        {infoMessage ? (
          <p className="zync-soft-notice mt-4 rounded-2xl px-4 py-3 text-sm font-medium">{infoMessage}</p>
        ) : null}
        {errorMessage ? (
          <p className="zync-soft-notice-danger mt-3 rounded-2xl px-4 py-3 text-sm font-medium">{errorMessage}</p>
        ) : null}
      </section>
    </div>
  );
}
