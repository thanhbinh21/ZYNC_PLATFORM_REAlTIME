import { Schema, model, type Document } from 'mongoose';

export const SKILL_TAGS = [
  'javascript','typescript','react','nextjs','vue','angular','svelte',
  'nodejs','express','nestjs','python','django','fastapi',
  'java','spring','go','rust','c-sharp','dotnet',
  'react-native','flutter','swift','kotlin',
  'postgresql','mongodb','redis','mysql',
  'docker','kubernetes','aws','gcp','azure',
  'graphql','rest-api','grpc',
  'git','ci-cd','testing','security',
  'ai-ml','data-science','blockchain','web3',
];

export const INTEREST_TAGS = [
  'frontend','backend','fullstack','mobile','devops','cloud',
  'ai-ml','data','security','blockchain','gamedev','embedded',
  'open-source','career','startup','freelance',
];

export interface IUser extends Document {
  email: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  skills?: string[];
  interests?: string[];
  githubUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  devRole?: 'developer' | 'mentor' | 'student' | 'recruiter' | 'other';
  onboardingCompleted: boolean;
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
    bio: { type: String, maxlength: 500 },
    skills: [{ type: String, enum: SKILL_TAGS }],
    interests: [{ type: String, enum: INTEREST_TAGS }],
    githubUrl: { type: String },
    portfolioUrl: { type: String },
    linkedinUrl: { type: String },
    devRole: {
      type: String,
      enum: ['developer','mentor','student','recruiter','other'],
      default: 'developer',
    },
    onboardingCompleted: { type: Boolean, default: false },
    passwordHash: { type: String, select: false },
    globalViolationCount: { type: Number, default: 0 },
    trustScore: { type: Number, default: 100 }, // 0 to 100
  },
  { timestamps: true },
);

export const UserModel = model<IUser>('User', userSchema);
