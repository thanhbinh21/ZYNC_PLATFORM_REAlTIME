import { Schema, model, type Document } from 'mongoose';

export type StoryMediaType = 'text' | 'image' | 'video';
export type StoryReactionType = '❤️' | '😂' | '😢' | '😡' | '👍' | '🔥';

export interface IStoryReaction {
  userId: string;
  type: StoryReactionType;
  createdAt: Date;
}

export interface IStory extends Document {
  userId: string;
  mediaType: StoryMediaType;
  mediaUrl?: string;
  content?: string;
  backgroundColor?: string;
  fontStyle?: string;
  viewerIds: string[];
  reactions: IStoryReaction[];
  expiresAt: Date;
}

const storyReactionSchema = new Schema<IStoryReaction>(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: ['❤️', '😂', '😢', '😡', '👍', '🔥'], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const storySchema = new Schema<IStory>(
  {
    userId: { type: String, required: true },
    mediaType: { type: String, enum: ['text', 'image', 'video'], required: true },
    mediaUrl: { type: String },
    content: { type: String },
    backgroundColor: { type: String },
    fontStyle: { type: String },
    viewerIds: [{ type: String }],
    reactions: [storyReactionSchema],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index – MongoDB auto-deletes document when expiresAt is reached
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ userId: 1 });

export const StoryModel = model<IStory>('Story', storySchema);
