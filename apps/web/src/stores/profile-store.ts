'use client';

import { fetchMyProfile, type MeUser } from '@/services/users';

type ProfileStore = {
  profile: MeUser | null;
  isLoading: boolean;
  isReady: boolean;
  load: () => Promise<void>;
};

let _profile: MeUser | null = null;
let _isLoading = false;
let _isReady = false;
let _listeners: Array<(profile: MeUser | null, isLoading: boolean, isReady: boolean) => void> = [];

function notify() {
  for (const listener of _listeners) {
    listener(_profile, _isLoading, _isReady);
  }
}

export const profileStore: ProfileStore = {
  get profile() { return _profile; },
  get isLoading() { return _isLoading; },
  get isReady() { return _isReady; },
  async load() {
    if (_isLoading || _isReady) return;
    _isLoading = true;
    notify();
    try {
      const p = await fetchMyProfile();
      _profile = p;
      _isReady = true;
    } catch {
      _isReady = true;
    } finally {
      _isLoading = false;
      notify();
    }
  },
};

export function subscribeToProfileStore(
  listener: (profile: MeUser | null, isLoading: boolean, isReady: boolean) => void,
): () => void {
  _listeners.push(listener);
  listener(_profile, _isLoading, _isReady);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}
