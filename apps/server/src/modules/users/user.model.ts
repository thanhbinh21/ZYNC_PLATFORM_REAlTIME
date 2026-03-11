import { Schema, model, type Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  passwordHash?: string;
}

const userSchema = new Schema<IUser>(
  {
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, sparse: true, unique: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 200 },
    passwordHash: { type: String, select: false },
  },
  { timestamps: true },
);

export const UserModel = model<IUser>('User', userSchema);
