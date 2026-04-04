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
  isLoading?: boolean;
  error?: string | null;
}

interface ConversationItem {
  id: string;
  name: string;
  preview: string;
  time: string;
  avatar: string;
  online?: boolean;
  active?: boolean;
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
  return (
    <aside className="border-r border-[#114538] bg-[linear-gradient(180deg,#06271f_0%,#052019_100%)] p-4 overflow-y-auto">
      <h2 className="text-2xl font-bold text-[#e6fff5] mb-4">Tin nhắn</h2>

      {/* Search */}
      <label className="flex h-11 items-center gap-2 rounded-xl bg-[#12392f] px-3 mb-4 text-[#88bca9]">
        <SearchIcon />
        <input
          type="text"
          placeholder="Tìm kiếm cuộc hội thoại"
          className="w-full bg-transparent text-sm text-[#d8f7ec] outline-none placeholder:text-[#90b8a9]"
        />
      </label>

      {/* Conversations */}
      {conversations.length === 0 ? (
        <div className="flex items-center justify-center h-40 text-[#99c2b3] text-center">
          <p>Không có cuộc hội thoại nào. Bắt đầu trò chuyện!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((item) => (
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
  chatPanelProps?: Partial<ChatPanelProps>;
}

export function HomeDashboardChatPanel({
  conversations,
  selectedConversationId = 'c1',
  onSelectConversation = () => {},
  chatPanelProps = {},
}: HomeDashboardChatPanelProps = {}) {
  return (
    <section className="h-full overflow-hidden rounded-3xl border border-[#104136] bg-[#031c16]">
      <div className="grid h-full grid-cols-1 gap-0 xl:grid-cols-[300px_1fr]">
        {/* Left: Conversation List */}
        <ConversationList
          conversations={conversations}
          selectedId={selectedConversationId}
          onSelectConversation={onSelectConversation}
        />

        {/* Right: Chat Panel */}
        <ChatPanel {...chatPanelProps} />
      </div>
    </section>
  );
}
