import { Schema, model, type Document } from 'mongoose';

export interface IDeviceToken extends Document {
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
}

const deviceTokenSchema = new Schema<IDeviceToken>(
  {
    userId: { type: String, required: true },
    deviceToken: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['ios', 'android', 'web'], required: true },
  },
  { timestamps: true },
);

deviceTokenSchema.index({ userId: 1 });

export const DeviceTokenModel = model<IDeviceToken>('DeviceToken', deviceTokenSchema);
