'use client';

import { useEffect, useRef, useState } from 'react';
import type { Message } from '@zync/shared-types';
import { MessageBubble } from '../atoms/message-bubble';
import { TypingIndicator } from '../atoms/typing-indicator';
import { MessageInput } from '../molecules/message-input';

// ==================== ICONS ====================

function PhoneIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 3a2.5 2.5 0 0 1 2.5-2.5h2.69a2.5 2.5 0 0 1 2.5 2.5v3.69a2.5 2.5 0 0 1-2.5 2.5H5a13 13 0 0 0 13 13v-3.81a2.5 2.5 0 0 1 2.5-2.5h3.69a2.5 2.5 0 0 1 2.5 2.5V21a2.5 2.5 0 0 1-2.5 2.5h-6.5A18 18 0 0 1 3.5 3Z" /></svg>;
}

function VideoIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x={1} y={5} width={15} height={14} rx={2} ry={2} /></svg>;
}

function InfoIcon({ className }: { className: string }) {
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"><circle cx={12} cy={12} r={10} /><line x1={12} y1={16} x2={12} y2={12} /><line x1={12} y1={8} x2={12.01} y2={8} /></svg>;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx="11" cy="11" r="6" />
      <path d="m16 16 4 4" strokeLinecap="round" />
    </svg>
  );
}

// ==================== TYPES ====================

interface ChatPanelProps {
  conversationId?: string;
  currentUserId?: string;
  participantName?: string;
  participantAvatar?: string;
  isOnline?: boolean;
  messages?: Message[];
  typingUsers?: Array<{ userId: string; displayName: string }>;
  onSendMessage?: (content: string, type: 'text' | 'image' | 'video', mediaUrl?: string) => Promise<void>;
  onStartTyping?: () => void;
  onStopTyping?: () => void;
  onLoadMore?: () => Promise<void>;
  onInfoClick?: () => void;
  isLoading?: boolean;
  error?: string | null;
}

interface ConversationItem {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatar: string;
  avatarUrl?: string;
  isGroup?: boolean;
  memberCount?: number;
  members?: Array<{ _id: string; displayName: string; avatarUrl?: string }>;
  online?: boolean;
  active?: boolean;
}

interface GroupFriendOption {
  id: string;
  displayName: string;
  avatarUrl?: string;
}

// ==================== CONVERSATION LIST ====================

interface ConversationListProps {
  conversations?: ConversationItem[];
  selectedId?: string;
  onSelectConversation?: (id: string) => void;
}

function ConversationList({
  conversations = [],
  selectedId,
  onSelectConversation = () => {},
}: ConversationListProps) {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const filteredConversations = normalizedQuery
    ? conversations.filter((item) => {
      return item.name.toLowerCase().includes(normalizedQuery)
        || item.preview.toLowerCase().includes(normalizedQuery);
    })
    : conversations;

  return (
    <aside className="border-r border-[#114538] bg-[linear-gradient(180deg,#06271f_0%,#052019_100%)] p-4 overflow-y-auto">
      <h2 className="text-2xl font-bold text-[#e6fff5] mb-4">Tin nhắn</h2>

      {/* Search */}
      <label className="flex h-11 items-center gap-2 rounded-xl bg-[#12392f] px-3 mb-4 text-[#88bca9]">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm cuộc hội thoại"
          className="w-full bg-transparent text-sm text-[#d8f7ec] outline-none placeholder:text-[#90b8a9]"
        />
      </label>

      {/* Conversations */}
      {filteredConversations.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-[#99c2b3] text-center">
          <p>{normalizedQuery ? 'Không tìm thấy hội thoại phù hợp.' : 'Không có cuộc hội thoại nào. Bắt đầu trò chuyện!'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectConversation(item.id)}
              className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                selectedId === item.id
                  ? 'border-[#2de3b3] bg-[#103a30]'
                  : 'border-transparent hover:border-[#204d40] hover:bg-[#0b3027]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 rounded-full bg-[#2f6657] text-[#dffef1] flex-shrink-0">
                  <span className="flex h-full w-full items-center justify-center text-sm font-semibold">
                    {item.avatar}
                  </span>
                  {item.online && (
                    <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#3aefbf]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-base font-semibold text-[#e6fff6]">{item.name}</p>
                    <p className="text-xs uppercase tracking-wide text-[#9ac7b7] whitespace-nowrap">{item.time}</p>
                  </div>
                  <p className="truncate text-sm text-[#9fc6b8]">{item.preview}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

// ==================== CHAT PANEL ====================

function ChatPanel({
  conversationId = 'demo',
  currentUserId = 'user123',
  participantName = 'Demo User',
  participantAvatar,
  isOnline = true,
  messages = [],
  typingUsers = [],
  onSendMessage = async () => {},
  onStartTyping = () => {},
  onStopTyping = () => {},
  onLoadMore = async () => {},
  isLoading = false,
  error = null,
  onInfoClick,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers, shouldAutoScroll]);

  // Detect if user scrolled up
  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    // If scrolled to bottom (within 100px), enable auto-scroll
    setShouldAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  return (
    <article className="flex flex-col h-full bg-[linear-gradient(180deg,#031d17_0%,#02140f_100%)]">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#114538] px-5 py-3 bg-[#06271f]">
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 rounded-full bg-[#376f5f]">
            <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-[#e6fff5]">
              {participantAvatar ? participantAvatar[0] : participantName[0]}
            </span>
            {isOnline && (
              <span className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-[#33e2b3]" />
            )}
          </div>
          <div>
            <p className="text-base font-semibold text-[#e4fff4]">{participantName}</p>
            <p className="text-xs text-[#53e1b5]">
              {isOnline ? 'đang hoạt động' : 'ngoại tuyến'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[#a8d8c7]">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a] hover:bg-[#16473a] transition-colors"
            title="Call"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a] hover:bg-[#16473a] transition-colors"
            title="Video call"
          >
            <VideoIcon className="w-5 h-5" />
          </button>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0d342a] hover:bg-[#16473a] transition-colors"
            title="Info"
            onClick={onInfoClick}
          >
            <InfoIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/30 border-b border-red-700 px-6 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-5 py-4 space-y-2"
      >
        {/* Load More Button */}
        {messages.length > 0 && (
          <div className="flex justify-center mb-4">
            <button
              onClick={onLoadMore}
              disabled={isLoading}
              className="px-4 py-2 bg-[#103a30] hover:bg-[#0b3027] text-[#9ac7b7] text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load more messages'}
            </button>
          </div>
        )}

        {/* Messages */}
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-[#99c2b3]">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <MessageBubble
                key={message._id}
                isOwn={message.senderId === currentUserId}
                content={message.content}
                type={message.type}
                mediaUrl={message.mediaUrl}
                status={message.status}
                timestamp={message.createdAt}
                senderAvatar={participantAvatar}
              />
            ))}

            {/* Typing Indicator */}
            {typingUsers.length > 0 && (
              <TypingIndicator
                userNames={typingUsers.map((u) => u.displayName)}
              />
            )}

            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <MessageInput
        onSend={onSendMessage}
        onStartTyping={onStartTyping}
        onStopTyping={onStopTyping}
        isLoading={isLoading}
        disabled={false}
      />
    </article>
  );
}

// ==================== MAIN COMPONENT ====================

interface HomeDashboardChatPanelProps {
  conversations?: ConversationItem[];
  selectedConversationId?: string;
  onSelectConversation?: (id: string) => void;
  friends?: GroupFriendOption[];
  onCreateGroup?: (name: string, memberIds: string[]) => Promise<{ _id: string }>;
  onAddGroupMembers?: (groupId: string, memberIds: string[]) => Promise<void>;
  isCreatingGroup?: boolean;
  chatPanelProps?: Partial<ChatPanelProps>;
}

interface CreateGroupModalProps {
  open: boolean;
  friends: GroupFriendOption[];
  selectedFriendIds: string[];
  groupName: string;
  query: string;
  isCreatingGroup: boolean;
  onClose: () => void;
  onChangeGroupName: (value: string) => void;
  onChangeQuery: (value: string) => void;
  onToggleFriend: (friendId: string) => void;
  onSubmit: () => void;
}

interface AddMembersModalProps {
  open: boolean;
  friends: GroupFriendOption[];
  existingMemberIds: string[];
  selectedMemberIds: string[];
  query: string;
  isSubmitting: boolean;
  onClose: () => void;
  onChangeQuery: (value: string) => void;
  onToggleMember: (friendId: string) => void;
  onSubmit: () => void;
}

function CreateGroupModal({
  open,
  friends,
  selectedFriendIds,
  groupName,
  query,
  isCreatingGroup,
  onClose,
  onChangeGroupName,
  onChangeQuery,
  onToggleFriend,
  onSubmit,
}: CreateGroupModalProps) {
  if (!open) return null;

  const normalizedQuery = query.trim().toLowerCase();
  const filteredFriends = normalizedQuery
    ? friends.filter((friend) => friend.displayName.toLowerCase().includes(normalizedQuery))
    : friends;

  const selectedSet = new Set(selectedFriendIds);
  const selectedFriends = friends.filter((friend) => selectedSet.has(friend.id));
  const canSubmit = selectedFriendIds.length >= 2 && selectedFriendIds.length <= 100 && !isCreatingGroup;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-4xl rounded-2xl border border-[#1a5c4a] bg-[linear-gradient(180deg,#083328_0%,#05231c_100%)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a5c4a] px-6 py-4">
          <h3 className="text-2xl font-semibold text-[#dffef2]">Tạo nhóm</h3>
          <button
            type="button"
            className="rounded-full bg-[#0f4335] px-3 py-1.5 text-sm text-[#9ed0be] hover:bg-[#145845]"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>

        <div className="px-6 py-4">
          <input
            value={groupName}
            onChange={(e) => onChangeGroupName(e.target.value)}
            placeholder="Nhập tên nhóm"
            className="mb-3 h-11 w-full rounded-xl border border-[#1d5b4a] bg-[#0b3b2f] px-4 text-sm text-[#d7f6eb] outline-none placeholder:text-[#7eb5a2] focus:border-[#2de3b3]"
          />

          <input
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder="Nhập tên bạn để tìm"
            className="h-11 w-full rounded-xl border border-[#1d5b4a] bg-[#0b3b2f] px-4 text-sm text-[#d7f6eb] outline-none placeholder:text-[#7eb5a2] focus:border-[#2de3b3]"
          />

          <p className="mt-3 text-sm text-[#8cc4b0]">
            Đã chọn {selectedFriendIds.length}/100 bạn. Cần tối thiểu 2 bạn để tạo nhóm.
          </p>
        </div>

        <div className="grid gap-4 border-t border-[#1a5c4a] px-6 py-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[#1a5c4a] bg-[#072d24] p-3">
            <p className="mb-3 text-sm font-semibold text-[#d8fbed]">Bạn bè của tôi</p>
            <div className="space-y-2">
              {filteredFriends.map((friend) => {
                const isSelected = selectedSet.has(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => onToggleFriend(friend.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                      isSelected
                        ? 'border-[#2de3b3] bg-[#0f4335]'
                        : 'border-[#175443] hover:border-[#22705b] hover:bg-[#0b3a2f]'
                    }`}
                  >
                    <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                      isSelected ? 'border-[#2de3b3] bg-[#2de3b3] text-[#073428]' : 'border-[#5b9785] text-transparent'
                    }`}>
                      ✓
                    </span>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#235646] text-sm font-semibold text-[#d8fbed]">
                      {friend.displayName.substring(0, 2).toUpperCase()}
                    </span>
                    <span className="truncate text-sm font-medium text-[#d6f8ec]">{friend.displayName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[#1a5c4a] bg-[#072d24] p-3">
            <p className="mb-3 text-sm font-semibold text-[#d8fbed]">Đã chọn</p>
            {selectedFriends.length === 0 ? (
              <p className="text-sm text-[#7ab09e]">Chưa có thành viên nào được chọn.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => onToggleFriend(friend.id)}
                    className="inline-flex items-center gap-2 rounded-full bg-[#0f4335] px-3 py-1 text-sm text-[#a6e3cf]"
                  >
                    <span>{friend.displayName}</span>
                    <span>x</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#1a5c4a] px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-[#0f4335] px-6 py-2 font-semibold text-[#a6e3cf] hover:bg-[#145845]"
            onClick={onClose}
            disabled={isCreatingGroup}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#1e6f59] px-6 py-2 font-semibold text-[#e6fff5] transition enabled:bg-[#2ab98f] enabled:hover:bg-[#22a17d] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isCreatingGroup ? 'Đang tạo...' : 'Tạo nhóm'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMembersModal({
  open,
  friends,
  existingMemberIds,
  selectedMemberIds,
  query,
  isSubmitting,
  onClose,
  onChangeQuery,
  onToggleMember,
  onSubmit,
}: AddMembersModalProps) {
  if (!open) return null;

  const existingSet = new Set(existingMemberIds);
  const selectedSet = new Set(selectedMemberIds);
  const normalizedQuery = query.trim().toLowerCase();

  const filteredFriends = normalizedQuery
    ? friends.filter((friend) => friend.displayName.toLowerCase().includes(normalizedQuery))
    : friends;

  const canSubmit = selectedMemberIds.length > 0 && !isSubmitting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-2xl rounded-2xl border border-[#1a5c4a] bg-[linear-gradient(180deg,#083328_0%,#05231c_100%)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a5c4a] px-6 py-4">
          <h3 className="text-2xl font-semibold text-[#dffef2]">Thêm thành viên</h3>
          <button
            type="button"
            className="rounded-full bg-[#0f4335] px-3 py-1.5 text-sm text-[#9ed0be] hover:bg-[#145845]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Đóng
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="flex h-11 items-center gap-2 rounded-xl border border-[#1d5b4a] bg-[#0b3b2f] px-3 text-[#7eb5a2]">
            <SearchIcon />
            <input
              type="text"
              value={query}
              onChange={(e) => onChangeQuery(e.target.value)}
              placeholder="Nhập tên, số điện thoại"
              className="w-full bg-transparent text-sm text-[#d7f6eb] outline-none placeholder:text-[#7eb5a2]"
            />
          </label>
        </div>

        <div className="max-h-[420px] overflow-y-auto border-t border-[#1a5c4a] px-6 py-4">
          <p className="mb-3 text-sm font-semibold text-[#d8fbed]">Trò chuyện gần đây</p>
          <div className="space-y-2">
            {filteredFriends.map((friend) => {
              const isExisting = existingSet.has(friend.id);
              const isSelected = selectedSet.has(friend.id);

              return (
                <button
                  key={friend.id}
                  type="button"
                  disabled={isExisting}
                  onClick={() => onToggleMember(friend.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${
                    isExisting
                      ? 'cursor-not-allowed border-[#2c6858] bg-[#0d3a2f] opacity-70'
                      : isSelected
                        ? 'border-[#2de3b3] bg-[#0f4335]'
                        : 'border-[#175443] hover:border-[#22705b] hover:bg-[#0b3a2f]'
                  }`}
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border ${
                    isExisting || isSelected
                      ? 'border-[#2de3b3] bg-[#2de3b3] text-[#073428]'
                      : 'border-[#5b9785] text-transparent'
                  }`}>
                    ✓
                  </span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#235646] text-sm font-semibold text-[#d8fbed]">
                    {friend.displayName.substring(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#d6f8ec]">{friend.displayName}</p>
                    {isExisting && <p className="text-xs text-[#8cc4b0]">Đã tham gia</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#1a5c4a] px-6 py-4">
          <button
            type="button"
            className="rounded-lg bg-[#0f4335] px-6 py-2 font-semibold text-[#a6e3cf] hover:bg-[#145845]"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Hủy
          </button>
          <button
            type="button"
            className="rounded-lg bg-[#1e6f59] px-6 py-2 font-semibold text-[#e6fff5] transition enabled:bg-[#2ab98f] enabled:hover:bg-[#22a17d] disabled:cursor-not-allowed disabled:opacity-60"
            onClick={onSubmit}
            disabled={!canSubmit}
          >
            {isSubmitting ? 'Đang thêm...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function HomeDashboardChatPanel({
  conversations,
  selectedConversationId = 'c1',
  onSelectConversation = () => {},
  friends = [],
  onCreateGroup,
  onAddGroupMembers,
  isCreatingGroup = false,
  chatPanelProps = {},
}: HomeDashboardChatPanelProps = {}) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [isAddMembersOpen, setIsAddMembersOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupQuery, setGroupQuery] = useState('');
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedAddMemberIds, setSelectedAddMemberIds] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const selectedConversation = (conversations ?? []).find((item) => item.id === selectedConversationId);

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriendIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      }

      if (prev.length >= 100) {
        return prev;
      }

      return [...prev, friendId];
    });
  };

  const openCreateGroupModal = () => {
    setGroupName('');
    setGroupQuery('');
    setSelectedFriendIds([]);
    setIsCreateGroupOpen(true);
  };

  const handleCreateGroup = async () => {
    if (!onCreateGroup) {
      return;
    }

    const trimmedName = groupName.trim();
    const finalName = trimmedName.length > 0 ? trimmedName : 'Nhóm mới';
    await onCreateGroup(finalName, selectedFriendIds);
    setIsCreateGroupOpen(false);
    setIsInfoOpen(false);
  };

  const openAddMembersModal = () => {
    setMemberSearchQuery('');
    setSelectedAddMemberIds([]);
    setIsAddMembersOpen(true);
  };

  const toggleAddMemberSelection = (friendId: string) => {
    setSelectedAddMemberIds((prev) => {
      if (prev.includes(friendId)) {
        return prev.filter((id) => id !== friendId);
      }
      return [...prev, friendId];
    });
  };

  const handleConfirmAddMembers = async () => {
    if (!onAddGroupMembers || !selectedConversationId || selectedAddMemberIds.length === 0) {
      return;
    }

    await onAddGroupMembers(selectedConversationId, selectedAddMemberIds);
    setIsAddMembersOpen(false);
  };

  const groupMemberPreview = selectedConversation?.members ?? [];
  const existingMemberIds = groupMemberPreview.map((member) => member._id);
  const isGroupConversation = Boolean(selectedConversation?.isGroup);
  const infoTitle = isGroupConversation ? 'Thông tin nhóm' : 'Thông tin hội thoại';

  return (
    <>
      <section className="h-full overflow-hidden rounded-3xl border border-[#104136] bg-[#031c16]">
        <div className={`grid h-full grid-cols-1 gap-0 ${isInfoOpen ? 'xl:grid-cols-[300px_1fr_320px]' : 'xl:grid-cols-[300px_1fr]'}`}>
        {/* Left: Conversation List */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelectConversation={onSelectConversation}
        />

        {/* Right: Chat Panel */}
          <ChatPanel
            {...chatPanelProps}
            onInfoClick={() => setIsInfoOpen((prev) => !prev)}
          />

          {isInfoOpen && (
            <aside className="hidden border-l border-[#114538] bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)] xl:flex xl:flex-col">
              <div className="border-b border-[#114538] px-5 py-4">
                <h3 className="text-xl font-semibold text-[#e2fff4]">{infoTitle}</h3>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5">
                <div className="mb-6 flex flex-col items-center text-center">
                  <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#245948] text-lg font-bold text-[#d6fbee]">
                    {selectedConversation?.avatar ?? 'N'}
                  </div>
                  <p className="text-xl font-semibold text-[#e2fff4]">{selectedConversation?.name ?? 'Hội thoại'}</p>
                  <p className="text-sm text-[#8abfab]">
                    {selectedConversation?.isGroup
                      ? `${selectedConversation.memberCount ?? 0} thành viên`
                      : 'Hội thoại cá nhân'}
                  </p>
                </div>

                <div className="mb-5 grid grid-cols-3 gap-2">
                  <button type="button" className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]">Tắt thông báo</button>
                  <button type="button" className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]">Ghim hội thoại</button>
                  {isGroupConversation ? (
                    <>
                      <button
                        type="button"
                        onClick={openAddMembersModal}
                        className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]"
                      >
                        Thêm thành viên
                      </button>
                      <button type="button" className="col-span-3 rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]">Quản lý nhóm</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={openCreateGroupModal}
                      className="rounded-xl bg-[#1f7a60] px-2 py-2 text-xs font-semibold text-[#e6fff5] hover:bg-[#1a664f]"
                    >
                      Tạo nhóm trò chuyện
                    </button>
                  )}
                </div>

                {!isGroupConversation && (
                  <>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Nhắc hẹn</p>
                      <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                      <p className="text-sm text-[#d6f8ec]">22 nhóm chung</p>
                    </div>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <div key={`direct-media-${idx}`} className="h-12 rounded-lg bg-[#0d3b2f]" />
                        ))}
                      </div>
                      <button type="button" className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">File</p>
                      <p className="text-sm text-[#d6f8ec]">File2_Architecture_OnThi.docx</p>
                      <p className="text-sm text-[#d6f8ec]">File1_Design_Patterns_OnThi.docx</p>
                      <p className="text-sm text-[#d6f8ec]">project-thi.zip</p>
                      <button type="button" className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                    </div>
                  </>
                )}

                {isGroupConversation && (
                  <>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Thành viên nhóm</p>
                      <p className="text-sm text-[#d6f8ec]">{selectedConversation?.memberCount ?? 0} thành viên</p>
                    </div>
                    <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Bảng tin nhóm</p>
                      <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                      <p className="text-sm text-[#d6f8ec]">Ghi chú, ghim, bình chọn</p>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                      <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                      <div className="grid grid-cols-4 gap-2">
                        {Array.from({ length: 8 }).map((_, idx) => (
                          <div key={`group-media-${idx}`} className="h-12 rounded-lg bg-[#0d3b2f]" />
                        ))}
                      </div>
                      <button type="button" className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                    </div>
                  </>
                )}
              </div>
            </aside>
          )}
        </div>
      </section>

      {isInfoOpen && (
        <div className="fixed inset-0 z-40 bg-black/45 xl:hidden">
          <aside className="ml-auto h-full w-[88%] max-w-sm overflow-y-auto border-l border-[#114538] bg-[linear-gradient(180deg,#05261e_0%,#031912_100%)] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[#e2fff4]">{infoTitle}</h3>
              <button
                type="button"
                className="rounded-full bg-[#0f4335] px-3 py-1 text-sm text-[#a6e3cf]"
                onClick={() => setIsInfoOpen(false)}
              >
                Đóng
              </button>
            </div>

            <div className="mb-5 flex flex-col items-center text-center">
              <div className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[#245948] text-lg font-bold text-[#d6fbee]">
                {selectedConversation?.avatar ?? 'N'}
              </div>
              <p className="text-lg font-semibold text-[#e2fff4]">{selectedConversation?.name ?? 'Hội thoại'}</p>
              <p className="text-sm text-[#8abfab]">
                {selectedConversation?.isGroup
                  ? `${selectedConversation.memberCount ?? 0} thành viên`
                  : 'Hội thoại cá nhân'}
              </p>
            </div>

            <div className="mb-5 grid grid-cols-3 gap-2">
              <button type="button" className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]">Tắt thông báo</button>
              <button type="button" className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]">Ghim hội thoại</button>
              {isGroupConversation ? (
                <>
                  <button
                    type="button"
                    onClick={openAddMembersModal}
                    className="rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]"
                  >
                    Thêm thành viên
                  </button>
                  <button type="button" className="col-span-3 rounded-xl bg-[#0d3b2f] px-2 py-2 text-xs font-medium text-[#c7f4e6]">Quản lý nhóm</button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={openCreateGroupModal}
                  className="rounded-xl bg-[#1f7a60] px-2 py-2 text-xs font-semibold text-[#e6fff5]"
                >
                  Tạo nhóm trò chuyện
                </button>
              )}
            </div>

            {!isGroupConversation && (
              <>
                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Nhắc hẹn</p>
                  <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                  <p className="text-sm text-[#d6f8ec]">22 nhóm chung</p>
                </div>
                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={`mobile-direct-media-${idx}`} className="h-12 rounded-lg bg-[#0d3b2f]" />
                    ))}
                  </div>
                  <button type="button" className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                </div>
                <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">File</p>
                  <p className="text-sm text-[#d6f8ec]">File2_Architecture_OnThi.docx</p>
                  <p className="text-sm text-[#d6f8ec]">File1_Design_Patterns_OnThi.docx</p>
                  <p className="text-sm text-[#d6f8ec]">project-thi.zip</p>
                  <button type="button" className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                </div>
              </>
            )}

            {isGroupConversation && (
              <>
                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Thành viên nhóm</p>
                  <p className="text-sm text-[#d6f8ec]">{selectedConversation?.memberCount ?? 0} thành viên</p>
                </div>
                <div className="mb-4 space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Bảng tin nhóm</p>
                  <p className="text-sm text-[#d6f8ec]">Danh sách nhắc hẹn</p>
                  <p className="text-sm text-[#d6f8ec]">Ghi chú, ghim, bình chọn</p>
                </div>
                <div className="space-y-2 rounded-2xl border border-[#175443] bg-[#072d24] p-4">
                  <p className="text-sm font-semibold uppercase tracking-wide text-[#9ad6c1]">Ảnh/Video</p>
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: 8 }).map((_, idx) => (
                      <div key={`mobile-group-media-${idx}`} className="h-12 rounded-lg bg-[#0d3b2f]" />
                    ))}
                  </div>
                  <button type="button" className="w-full rounded-lg bg-[#0f4335] px-3 py-2 text-sm font-semibold text-[#c7f4e6]">Xem tất cả</button>
                </div>
              </>
            )}
          </aside>
        </div>
      )}

      <CreateGroupModal
        open={isCreateGroupOpen}
        friends={friends}
        selectedFriendIds={selectedFriendIds}
        groupName={groupName}
        query={groupQuery}
        isCreatingGroup={isCreatingGroup}
        onClose={() => setIsCreateGroupOpen(false)}
        onChangeGroupName={setGroupName}
        onChangeQuery={setGroupQuery}
        onToggleFriend={toggleFriendSelection}
        onSubmit={handleCreateGroup}
      />

      <AddMembersModal
        open={isAddMembersOpen}
        friends={friends}
        existingMemberIds={existingMemberIds}
        selectedMemberIds={selectedAddMemberIds}
        query={memberSearchQuery}
        isSubmitting={isCreatingGroup}
        onClose={() => setIsAddMembersOpen(false)}
        onChangeQuery={setMemberSearchQuery}
        onToggleMember={toggleAddMemberSelection}
        onSubmit={handleConfirmAddMembers}
      />
    </>
  );
}
