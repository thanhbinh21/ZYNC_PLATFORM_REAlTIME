'use client';

// Define the shape based on useHomeDashboard's activeCall
export interface CallSessionState {
  sessionId: string;
  conversationId: string | null;
  isGroupCall: boolean;
  initiatedBy: string;
  participantIds: string[];
  joinedParticipantIds: string[];
  participantDisplayNames: Record<string, string>;
  direction: 'incoming' | 'outgoing';
  status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'rejected' | 'outgoing' | 'incoming';
  reason?: string;
  callToken: string;
  timeoutAt?: string | null;
}

type CallStore = {
  activeCall: CallSessionState | null;
  setActiveCall: (updater: CallSessionState | null | ((prev: CallSessionState | null) => CallSessionState | null)) => void;
};

let _activeCall: CallSessionState | null = null;
let _listeners: Array<(activeCall: CallSessionState | null) => void> = [];

function notify() {
  for (const listener of _listeners) {
    listener(_activeCall);
  }
}

export const callStore: CallStore = {
  get activeCall() {
    return _activeCall;
  },
  setActiveCall(updater) {
    if (typeof updater === 'function') {
      _activeCall = updater(_activeCall);
    } else {
      _activeCall = updater;
    }
    notify();
  },
};

export function subscribeToCallStore(
  listener: (activeCall: CallSessionState | null) => void,
): () => void {
  _listeners.push(listener);
  listener(_activeCall);
  return () => {
    _listeners = _listeners.filter((l) => l !== listener);
  };
}
