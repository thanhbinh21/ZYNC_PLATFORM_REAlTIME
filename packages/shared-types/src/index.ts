// Kiểu dữ liệu dùng chung cho server, web và mobile

// Kiểu dữ liệu User
export interface User {
  _id: string;
  username?: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

// Kiểu dữ liệu Friendship
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export interface Friendship {
  _id: string;
  userId: string;
  friendId: string;
  status: FriendshipStatus;
  createdAt: string;
}

// Kiểu dữ liệu Conversation
export type ConversationType = 'direct' | 'group';

export interface Conversation {
  _id: string;
  type: ConversationType;
  name?: string;
  avatarUrl?: string;
  members: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: string;
  };
  unreadCount: number;
  updatedAt: string;
}

// Kiểu dữ liệu Message
export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'sticker' | `file/${string}` | 'system-recall';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface MessageReactionSummary {
  totalCount: number;
  emojiCounts: Record<string, number>;
}

export interface MessageReactionUserState {
  lastEmoji: string | null;
  totalCount: number;
  emojiCounts: Record<string, number>;
}

export interface MessageReplyTo {
  messageRef: string;
  messageId?: string;
  senderId?: string;
  senderDisplayName?: string;
  contentPreview?: string;
  type?: string;
  isDeleted?: boolean;
}

export interface MessageReadParticipant {
  userId: string;
  displayName: string;
  avatarUrl?: string;
}

export interface MessageReadParticipantWithTime extends MessageReadParticipant {
  readAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  moderationWarning?: boolean;
  replyTo?: MessageReplyTo;
  idempotencyKey: string;
  status: MessageStatus;
  createdAt: string;
  reactionSummary?: MessageReactionSummary;
  reactionUserState?: MessageReactionUserState;
  readBy?: MessageReadParticipantWithTime[];
  readByPreview?: MessageReadParticipantWithTime[];
  sentTo?: MessageReadParticipant[];
}

// Kiểu dữ liệu Story
export type StoryMediaType = 'text' | 'image';

export interface Story {
  _id: string;
  userId: string;
  mediaType: StoryMediaType;
  mediaUrl?: string;
  content?: string;
  viewerIds: string[];
  expiresAt: string;
  createdAt: string;
}

// Payload cho Socket.IO events

// Client gửi lên Server
export interface SendMessagePayload {
  conversationId: string;
  content: string;
  type: MessageType;
  idempotencyKey: string;
  mediaUrl?: string;
  replyToMessageRef?: string;
  replyToMessageId?: string;
  replyToPreview?: string;
  replyToSenderId?: string;
  replyToSenderDisplayName?: string;
  replyToType?: string;
}

export interface MessageReadPayload {
  conversationId: string;
  messageIds: string[];
}

export interface TypingPayload {
  conversationId: string;
}

// Server gửi xuống Client
export interface ReceiveMessagePayload {
  messageId: string;
  conversationId: string;
  idempotencyKey: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  moderationWarning?: boolean;
  replyTo?: MessageReplyTo;
  createdAt: string;
}

export interface StatusUpdatePayload {
  messageId?: string;
  messageIds?: string[];
  idempotencyKeys?: string[];
  conversationId?: string;
  status: MessageStatus;
  userId: string;
  updatedAt?: string;
  reader?: MessageReadParticipantWithTime;
}

export interface TypingIndicatorPayload {
  userId: string;
  conversationId: string;
  isTyping: boolean;
}

export interface UserOnlinePayload {
  userId: string;
  online: boolean;
  lastSeen?: string;
}

export interface FriendRequestPayload {
  requestId: string;
  fromUserId: string;
  createdAt: string;
}

export interface GroupUpdatedPayload {
  groupId: string;
  type: 'member_added' | 'member_removed' | 'name_changed' | 'avatar_changed' | 'disbanded';
  data: Record<string, unknown>;
}

// Kiểu dữ liệu Sticker
export interface ISticker {
  stickerId: string;
  mediaUrl: string;
  alt?: string;
  category?: string;
}

export interface IStickerPack {
  _id?: string;
  packId: string;
  packName: string;
  packDescription?: string;
  stickers: ISticker[];
  icon?: string;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

// Wrapper Response chuẩn cho REST API
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
