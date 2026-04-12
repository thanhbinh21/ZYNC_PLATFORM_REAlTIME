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

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  content?: string;
  type: MessageType;
  mediaUrl?: string;
  storyRef?: IStoryRef;
  idempotencyKey: string;
  
  // Deletion fields
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  deleteType?: DeleteType;
  deletedFor?: string[];
  
  createdAt: Date;
}

const storyRefSchema = new Schema<IStoryRef>(
  {
    storyId: { type: String, required: true },
    ownerId: { type: String, required: true },
    mediaType: { type: String, enum: ['text', 'image', 'video'], required: true },
    thumbnail: { type: String },
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
    idempotencyKey: { type: String, required: true, unique: true },
    
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
