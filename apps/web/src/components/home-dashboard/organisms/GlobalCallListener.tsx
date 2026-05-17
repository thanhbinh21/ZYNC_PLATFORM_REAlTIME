'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSocket,
  listenToCallIncoming,
  listenToCallStatus,
  unlistenToCallIncoming,
  unlistenToCallStatus,
  type CallIncomingPayload,
  type CallStatusPayload,
} from '@/services/socket';
import { getAccessToken } from '@/utils/auth-token';
import { callStore } from '@/stores/call-store';
import { WEB_IN_APP_TOAST_EVENT, type WebInAppToastDetail } from '@/components/notifications/InAppNotificationToasts';

function setIncomingCall(payload: CallIncomingPayload) {
  if (callStore.activeCall?.sessionId === payload.sessionId) {
    return;
  }

  callStore.setActiveCall({
    sessionId: payload.sessionId,
    conversationId: payload.conversationId || null,
    isGroupCall: Boolean(payload.isGroupCall),
    initiatedBy: payload.fromUserId,
    participantIds: payload.participantIds || [payload.fromUserId],
    joinedParticipantIds: [payload.fromUserId],
    participantDisplayNames: {},
    direction: 'incoming',
    status: 'incoming',
    callToken: payload.callToken,
    callType: payload.callType || 'video',
    timeoutAt: payload.timeoutAt ?? null,
  });
}

export function GlobalCallListener() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const socket = getSocket(token);

    const handleCallIncoming = (payload: CallIncomingPayload) => {
      setIncomingCall(payload);

      const toastId = `call-${payload.sessionId}`;
      const isAudioCall = payload.callType === 'audio';
      const callerName = payload.callerName || 'Người gọi';
      const targetName = payload.isGroupCall
        ? (payload.conversationName || 'Nhóm')
        : callerName;

      const detail: WebInAppToastDetail = {
        id: toastId,
        type: 'community_post',
        title: payload.isGroupCall ? `Cuộc gọi nhóm: ${targetName}` : `Cuộc gọi từ ${callerName}`,
        body: payload.isGroupCall
          ? `${callerName} đang gọi ${isAudioCall ? 'thoại' : 'video'} trong nhóm`
          : `Bạn đang có cuộc gọi ${isAudioCall ? 'thoại' : 'video'}`,
        durationMs: 30000,
        actions: [
          {
            label: 'Trả lời',
            variant: 'primary',
            onClick: () => {
              setIncomingCall(payload);
              window.sessionStorage.setItem('zync.autoAcceptCallSessionId', payload.sessionId);
              router.push(payload.conversationId ? `/chat?conversationId=${payload.conversationId}` : '/chat');
            },
          },
          {
            label: 'Từ chối',
            variant: 'danger',
            onClick: () => {
              socket.emit('call_reject', {
                sessionId: payload.sessionId,
                reason: 'rejected',
                callToken: payload.callToken,
              });
              callStore.setActiveCall((prev) => (prev?.sessionId === payload.sessionId ? null : prev));
            },
          },
        ],
      };

      window.dispatchEvent(new CustomEvent(WEB_IN_APP_TOAST_EVENT, { detail }));
    };

    const handleCallStatus = (payload: CallStatusPayload) => {
      if (['ended', 'missed', 'rejected', 'connecting', 'connected'].includes(payload.status)) {
        window.dispatchEvent(new CustomEvent(WEB_IN_APP_TOAST_EVENT, {
          detail: {
            id: `call-${payload.sessionId}`,
            title: '',
            body: '',
            dismiss: true,
          } satisfies WebInAppToastDetail,
        }));
      }
    };

    listenToCallIncoming(handleCallIncoming);
    listenToCallStatus(handleCallStatus);

    return () => {
      unlistenToCallIncoming(handleCallIncoming);
      unlistenToCallStatus(handleCallStatus);
    };
  }, [router]);

  return null;
}
