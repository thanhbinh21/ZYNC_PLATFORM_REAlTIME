import type { FriendUser } from '@/services/friends';
import { Search, UserPlus, UserX, X } from 'lucide-react';
import { useState } from 'react';
import { FriendsAvatar } from '../atoms/friends-avatar';

interface SearchPanelProps {
  searchKeyword: string;
  searchResults: FriendUser[];
  isLoading: boolean;
  onSearchKeywordChange: (value: string) => void;
  onSearch: () => Promise<void>;
  onClearSearch: () => void;
  onSendRequest: (toUserId: string) => Promise<void>;
}

export function SearchPanel({
  searchKeyword,
  searchResults,
  isLoading,
  onSearchKeywordChange,
  onSearch,
  onClearSearch,
  onSendRequest,
}: SearchPanelProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      void onSearch();
    }
    if (e.key === 'Escape') {
      onClearSearch();
    }
  };

  const hasSearched = searchKeyword.trim().length > 0;
  const showResults = hasSearched && searchResults.length > 0;
  const showEmpty = hasSearched && searchResults.length === 0 && !isLoading;

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className={`relative transition-all duration-300 ${isFocused ? 'scale-[1.01]' : ''}`}>
        <div className="relative">
          <Search
            className={`absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 transition-colors ${
              isFocused ? 'text-[var(--accent)]' : 'text-[var(--text-tertiary)]'
            }`}
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => onSearchKeywordChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Tìm bạn bè bằng tên hoặc @username..."
            className={`zync-soft-input w-full ${
              isFocused ? 'ring-2 ring-[var(--accent)]/20' : ''
            }`}
            style={{ paddingLeft: '3rem', paddingRight: '3rem' }}
            disabled={isLoading}
          />
          {searchKeyword && (
            <button
              type="button"
              onClick={onClearSearch}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)]"
              aria-label="Xóa tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Button */}
      <button
        type="button"
        onClick={() => { void onSearch(); }}
        disabled={isLoading || !searchKeyword.trim()}
        className="zync-soft-button flex w-full items-center justify-center gap-2 py-3"
      >
        <Search className="h-4 w-4" />
        Tìm kiếm
      </button>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)]/30 border-t-[var(--accent)]" />
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-3">
          <p className="font-ui-meta text-xs text-[var(--text-tertiary)]">
            Tìm thấy {searchResults.length} người
          </p>
          {searchResults.map((user) => (
            <article
              key={user.id}
              className="zync-soft-card flex items-center gap-4 p-4 transition-all hover:border-[var(--accent)]/30"
            >
              <FriendsAvatar name={user.displayName} avatarUrl={user.avatarUrl} size="md" />

              <div className="min-w-0 flex-1">
                <p className="font-ui-title text-sm text-[var(--text-primary)] truncate">
                  {user.displayName}
                </p>
                {user.username && (
                  <p className="font-ui-meta text-xs text-[var(--text-tertiary)]">
                    @{user.username}
                  </p>
                )}
                {user.bio && (
                  <p className="font-ui-content mt-0.5 text-xs text-[var(--text-secondary)] line-clamp-1">
                    {user.bio}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => { void onSendRequest(user.id); }}
                disabled={isLoading}
                className="zync-soft-button flex shrink-0 items-center gap-1.5 px-4 py-2 text-sm"
              >
                <UserPlus className="h-4 w-4" />
                Kết bạn
              </button>
            </article>
          ))}
        </div>
      )}

      {/* Empty State */}
      {showEmpty && (
        <div className="zync-soft-card-muted flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--bg-hover)]">
            <UserX className="h-6 w-6 text-[var(--text-tertiary)]" />
          </div>
          <div>
            <p className="font-ui-title text-sm text-[var(--text-primary)]">
              Không tìm thấy người dùng
            </p>
            <p className="font-ui-content mt-1 text-xs text-[var(--text-secondary)]">
              Thử từ khóa khác hoặc kiểm tra lại chính tả
            </p>
          </div>
        </div>
      )}

      {/* Initial State */}
      {!hasSearched && !isLoading && (
        <div className="zync-soft-card flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10">
            <Search className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <div>
            <p className="font-ui-title text-sm text-[var(--text-primary)]">
              Tìm bạn mới
            </p>
            <p className="font-ui-content mt-1 text-xs text-[var(--text-secondary)]">
              Nhập tên hoặc @username để tìm kiếm
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
