import { apiClient } from './api';

export interface MeUser {
  _id: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  createdAt?: string;
}

export interface UpdateMyProfilePayload {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export async function fetchMyProfile(): Promise<MeUser> {
  const { data } = await apiClient.get<{ success: boolean; user: MeUser }>('/api/users/me');
  return data.user;
}

export async function updateMyProfile(payload: UpdateMyProfilePayload): Promise<MeUser> {
  const { data } = await apiClient.patch<{ success: boolean; user: MeUser }>('/api/users/me', payload);
  return data.user;
}