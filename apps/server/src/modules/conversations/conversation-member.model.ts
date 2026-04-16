import { Schema, model, type Document } from 'mongoose';

export interface IConversationMember extends Document {
  conversationId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  penaltyScore: number;
  penaltyWindowStartedAt?: Date;
  mutedUntil?: Date;
}

const memberSchema = new Schema<IConversationMember>({
  conversationId: { type: String, required: true },
  userId: { type: String, required: true },
  role: { type: String, enum: ['admin', 'member'], default: 'member' },
  joinedAt: { type: Date, default: Date.now },
  penaltyScore: { type: Number, default: 0, min: 0, max: 100 },
  penaltyWindowStartedAt: { type: Date },
  mutedUntil: { type: Date },
});

memberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });
memberSchema.index({ userId: 1 });

export const ConversationMemberModel = model<IConversationMember>('ConversationMember', memberSchema);
