import { Schema, model, type Document } from 'mongoose';

export interface IUser extends Document {
  phoneNumber?: string;
  email?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  passwordHash?: string;
  globalViolationCount: number;
  trustScore: number;
}

const userSchema = new Schema<IUser>(
  {
    phoneNumber: { type: String, unique: true, sparse: true },
    email: { type: String, sparse: true, unique: true },
    displayName: { type: String, required: true },
    avatarUrl: { type: String },
    bio: { type: String, maxlength: 200 },
    passwordHash: { type: String, select: false },
    globalViolationCount: { type: Number, default: 0 },
    trustScore: { type: Number, default: 100 }, // 0 to 100
  },
  { timestamps: true },
);

// Đảm bảo user luôn có ít nhất phoneNumber hoặc email
userSchema.pre('validate', function validateIdentifier(next) {
  if (!this.phoneNumber && !this.email) {
    this.invalidate('phoneNumber', 'Either phoneNumber or email is required');
  }
  next();
});

export const UserModel = model<IUser>('User', userSchema);
