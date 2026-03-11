import { Schema, model, type Document } from 'mongoose';

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'file' | 'sticker';
export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface IMessage extends Document {
  conversationId: string;
  senderId: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  idempotencyKey: string;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    conversationId: { type: String, required: true },
    senderId: { type: String, required: true },
    content: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'sticker'],
      default: 'text',
    },
    mediaUrl: { type: String },
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: true },
);

messageSchema.index({ conversationId: 1, createdAt: -1 });

export const MessageModel = model<IMessage>('Message', messageSchema);
