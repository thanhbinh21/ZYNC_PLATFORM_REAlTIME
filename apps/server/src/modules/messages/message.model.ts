import { Schema, model, type Document } from 'mongoose';
import { type StoryMediaType } from '../stories/story.model';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'sticker' | `file/${string}`;
export type MessageStatus = 'sent' | 'delivered' | 'read';

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
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const MessageModel = model<IMessage>('Message', messageSchema);
