// Kiểu dữ liệu dùng chung cho server, web và mobile

// Kiểu dữ liệu User
export interface User {
  _id: string;
  phoneNumber: string;
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

export interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  idempotencyKey: string;
  status: MessageStatus;
  createdAt: string;
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
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  createdAt: string;
}

export interface StatusUpdatePayload {
  messageId: string;
  status: MessageStatus;
  userId: string;
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
