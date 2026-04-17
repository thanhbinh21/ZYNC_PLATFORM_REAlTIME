import { Schema, model, type Document } from 'mongoose';

export interface IUser extends Document {
  email: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  passwordHash?: string;
  globalViolationCount: number;
  trustScore: number;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9._]+$/,
    },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 200 },
    passwordHash: { type: String, select: false },
    globalViolationCount: { type: Number, default: 0 },
    trustScore: { type: Number, default: 100 }, // 0 to 100
  },
  { timestamps: true },
);

export const UserModel = model<IUser>('User', userSchema);
