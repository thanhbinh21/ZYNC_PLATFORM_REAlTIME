import { Schema, model, type Document } from 'mongoose';
import { type StoryMediaType } from '../stories/story.model';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'sticker' | `file/${string}` | 'system-recall';
export type MessageStatus = 'sent' | 'delivered' | 'read';
export type DeleteType = 'unsend' | 'recall';

export interface IStoryRef {
  storyId: string;
  ownerId: string;
  mediaType: StoryMediaType;
  thumbnail?: string;
}

export interface IReplyTo {
  messageRef: string;
  messageId?: string;
  senderId?: string;
  senderDisplayName?: string;
  contentPreview?: string;
  type?: string;
  isDeleted?: boolean;
}

export interface IReadByPreviewItem {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  readAt: Date;
}

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
  storyRef?: IStoryRef;
  replyTo?: IReplyTo;
  idempotencyKey: string;
  
    // Deletion fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deleteType?: DeleteType;
  deletedFor?: string[];
  
  // Chat Reactions
  reactions?: Array<{ type: string; userId: string }>;
  moderationWarning?: boolean;
  readByPreview?: IReadByPreviewItem[];

  createdAt: Date;
}

const reactionSchema = new Schema(
  {
    type: { type: String, required: true },
    userId: { type: String, required: true },
  },
  { _id: false },
);

const storyRefSchema = new Schema<IStoryRef>(
  {
    storyId: { type: String, required: true },
    ownerId: { type: String, required: true },
    mediaType: { type: String, enum: ['text', 'image', 'video'], required: true },
    thumbnail: { type: String },
  },
  { _id: false },
);

const replyToSchema = new Schema<IReplyTo>(
  {
    messageRef: { type: String, required: true },
    messageId: { type: String },
    senderId: { type: String },
    senderDisplayName: { type: String },
    contentPreview: { type: String },
    type: { type: String },
    isDeleted: { type: Boolean, default: false },
  },
  { _id: false },
);

const readByPreviewSchema = new Schema<IReadByPreviewItem>(
  {
    userId: { type: String, required: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    readAt: { type: Date, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    content: { type: String, required: false },
    type: {
      type: String,
      validate: {
        validator: (v: string) => /^(text|image|video|audio|sticker|file\/.+)$/.test(v),
        message: 'Invalid message type. Must be: text, image, video, audio, sticker, or file/<filename>'
      },
      default: 'text',
    },
    mediaUrl: { type: String },
    storyRef: { type: storyRefSchema },
    replyTo: { type: replyToSchema },
    idempotencyKey: { type: String, required: true, unique: true },
    
    // Chat Reactions
    reactions: { type: [reactionSchema], default: [] },
    moderationWarning: { type: Boolean, default: false },
    readByPreview: { type: [readByPreviewSchema], default: [] },
    
    // Deletion fields
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    deletedBy: { type: String },
    deleteType: { type: String, enum: ['unsend', 'recall'] },
    deletedFor: [{ type: String }],
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ isDeleted: 1 });

export const MessageModel = model<IMessage>('Message', messageSchema);
