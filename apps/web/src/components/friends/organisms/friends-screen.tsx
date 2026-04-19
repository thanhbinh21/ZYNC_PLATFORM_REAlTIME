import Link from 'next/link';
import type { FriendsScreenProps } from '../friends.types';
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
    <div className="flex h-full w-full flex-col overflow-y-auto px-4 py-5 sm:px-6 lg:px-8 text-white">
      <section className="w-full">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-ui-title text-[clamp(1.8rem,4vw,2.8rem)] text-[#daf5ec]">Trung tâm bạn bè</h1>
            <p className="font-ui-content mt-1 text-base text-[#9fcabd]">Quản lý kết nối, lời mời và danh sách bạn bè ở một nơi duy nhất.</p>
          </div>
        </header>

        <section className="mt-7 grid gap-6 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-[#16513f] bg-[#0a4335]/70 p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-ui-title text-xl text-[#d8f4eb]">Lời mời kết bạn ({pendingTotal})</h2>
            </div>

            <div className="mt-4 space-y-3">
              {incomingRequests.length === 0 ? (
                <p className="font-ui-meta text-sm text-[#8db5a8]">Chưa có lời mời đến.</p>
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

            <h3 className="font-ui-title mt-6 text-base text-[#d8f4eb]">Lời mời đã gửi</h3>
            <div className="mt-3 space-y-3">
              {outgoingRequests.length === 0 ? (
                <p className="font-ui-meta text-sm text-[#8db5a8]">Bạn chưa gửi lời mời nào.</p>
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

          <div className="rounded-2xl border border-[#16513f] bg-[#0a4335]/70 p-5">
            <h2 className="font-ui-title text-xl text-[#d8f4eb]">Tìm người để kết bạn</h2>
            <div className="mt-3 flex gap-2">
              <input
                value={searchKeyword}
                onChange={(event) => onSearchKeywordChange(event.target.value)}
                placeholder="Nhập @username hoặc email"
                className="font-ui-content h-11 w-full rounded-xl border border-[#1f6651] bg-[#0d4a3b]/75 px-4 text-sm text-[#d8f4eb] outline-none placeholder:text-[#7da79a]"
              />
              <button
                type="button"
                onClick={() => {
                  void onSearch();
                }}
                disabled={isLoading}
                className="font-ui-title h-11 rounded-xl bg-[#36d4a8] px-4 text-sm text-[#063328] transition hover:brightness-110 disabled:opacity-60"
              >
                Tìm
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {searchResults.length === 0 ? (
                <p className="font-ui-meta text-sm text-[#8db5a8]">Chưa có kết quả tìm kiếm.</p>
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

        <section className="mt-6 rounded-2xl border border-[#16513f] bg-[#0a4335]/70 p-5">
          <h2 className="font-ui-title text-xl text-[#d8f4eb]">Danh sách bạn bè ({friends.length})</h2>
          <div className="mt-4 space-y-3">
            {friends.length === 0 ? (
              <p className="font-ui-meta text-sm text-[#8db5a8]">Bạn chưa có bạn bè nào.</p>
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
              className="font-ui-title mt-5 h-10 rounded-xl border border-[#2f8f73] px-4 text-sm text-[#c8ece1] transition hover:bg-[#0f4d3e] disabled:opacity-60"
            >
              Tải thêm bạn bè
            </button>
          ) : null}
        </section>

        {infoMessage ? <p className="font-ui-content mt-4 rounded-lg border border-[#3a876d] bg-[#154335]/60 px-3 py-2 text-sm text-[#c8f3e2]">{infoMessage}</p> : null}
        {errorMessage ? <p className="font-ui-content mt-3 rounded-lg border border-[#b75662] bg-[#601e29]/55 px-3 py-2 text-sm text-[#ffcccf]">{errorMessage}</p> : null}
      </section>
    </div>
  );
}
