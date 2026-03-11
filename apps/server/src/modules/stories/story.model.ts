import { Schema, model, type Document } from 'mongoose';

export type StoryMediaType = 'text' | 'image';

export interface IStory extends Document {
  userId: string;
  mediaType: StoryMediaType;
  mediaUrl?: string;
  content?: string;
  viewerIds: string[];
  expiresAt: Date;
}

const storySchema = new Schema<IStory>(
  {
    userId: { type: String, required: true },
    mediaType: { type: String, enum: ['text', 'image'], required: true },
    mediaUrl: { type: String },
    content: { type: String },
    viewerIds: [{ type: String }],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// TTL index – MongoDB auto-deletes document when expiresAt is reached
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ userId: 1 });

export const StoryModel = model<IStory>('Story', storySchema);
