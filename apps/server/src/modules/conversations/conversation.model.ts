import { Schema, model, type Document } from 'mongoose';

export type ConversationType = 'direct' | 'group';

export interface IConversation extends Document {
  type: ConversationType;
  name?: string;
  avatarUrl?: string;
  createdBy?: string;
  adminIds: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    sentAt: Date;
  };
  unreadCounts: Map<string, number>;
  updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
  {
    type: { type: String, enum: ['direct', 'group'], required: true },
    name: { type: String },
    avatarUrl: { type: String },
    createdBy: { type: String },
    adminIds: [{ type: String }],
    lastMessage: {
      content: { type: String },
      senderId: { type: String },
      sentAt: { type: Date },
    },
    unreadCounts: { type: Map, of: Number, default: {} },
  },
  { timestamps: true },
);

conversationSchema.index({ 'unreadCounts': 1 });
conversationSchema.index({ 'lastMessage.sentAt': -1 });
conversationSchema.index({ updatedAt: -1 });

export const ConversationModel = model<IConversation>('Conversation', conversationSchema);
