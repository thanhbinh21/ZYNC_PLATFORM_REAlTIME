export type StoryMediaType = 'text' | 'image' | 'video';
export type StoryReactionType = '❤️' | '😂' | '😢' | '😡' | '👍' | '🔥';

export const REACTION_TYPES: StoryReactionType[] = ['❤️', '😂', '😢', '😡', '👍', '🔥'];

export interface StoryUser {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  initials: string;
}

export interface StoryItem {
  _id: string;
  userId: string;
  mediaType: StoryMediaType;
  mediaUrl?: string;
  content?: string;
  backgroundColor?: string;
  fontStyle?: string;
  viewerIds: string[];
  reactions: StoryReactionEntry[];
  expiresAt: string;
  createdAt: string;
}

export interface StoryReactionEntry {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  type: string;
  createdAt: string;
}

export interface StoryFeedGroup {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  stories: StoryItem[];
}

export interface StoryAvatarProps {
  initials: string;
  avatarUrl?: string;
  seen: boolean;
  isOwner?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export interface StoryProgressBarProps {
  total: number;
  current: number;
  duration: number;
  paused: boolean;
  onComplete: () => void;
}

export interface ReactionButtonProps {
  emoji: StoryReactionType;
  active?: boolean;
  onClick: (emoji: StoryReactionType) => void;
}

export interface StoryCardProps {
  user: StoryUser;
  latestStory: StoryItem;
  seen: boolean;
  onClick: () => void;
}

export interface StoryCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    mediaType: StoryMediaType;
    content?: string;
    mediaUrl?: string;
    backgroundColor?: string;
    fontStyle?: string;
  }) => void;
}

export interface ReactionPickerProps {
  onSelect: (emoji: StoryReactionType) => void;
  activeEmoji?: string;
}

export interface StoryReplyInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export interface StoryReactionsModalProps {
  open: boolean;
  reactions: StoryReactionEntry[];
  onClose: () => void;
}

export interface StoryBarProps {
  feed: StoryFeedGroup[];
  myStories: StoryItem[];
  currentUserId: string;
  onViewStory: (groupIndex: number) => void;
  onCreateStory: () => void;
}

export interface StoryViewerProps {
  feed: StoryFeedGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onReact: (storyId: string, emoji: StoryReactionType) => void;
  onReply: (storyId: string, content: string) => void;
  onView: (storyId: string) => void;
  onDelete: (storyId: string) => void;
}
