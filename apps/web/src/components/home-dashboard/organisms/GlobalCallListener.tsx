'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useRouter, usePathname } from 'next/navigation';
import { getSocket } from '@/services/socket';
import { getAccessToken } from '@/utils/auth-token';
import { callStore } from '@/stores/call-store';
import { PhoneIncoming } from 'lucide-react';

export function GlobalCallListener() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const socket = getSocket(token);

      const handleCallIncoming = (payload: any) => {
        // If the user is on /chat or /home, useHomeDashboard will handle it.
        // We still show a toast globally if they are not on the chat page with this specific conversation.
        // Actually, let's just always show a toast unless they are actively in the chat page?
        // Let's show the toast everywhere, it's a small popup that is useful.
        const toastId = `call-${payload.sessionId}`;
        
        toast((t) => (
          <div className="flex flex-col gap-3 p-2 min-w-[250px]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                <PhoneIncoming size={20} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Cuộc gọi đến</span>
                <span className="text-xs text-text-tertiary">Bạn đang có cuộc gọi video...</span>
              </div>
            </div>
            <div className="flex gap-2 mt-2 w-full">
              <button 
                className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors"
                onClick={() => {
                  toast.dismiss(t.id);
                  // Ensure it's in the store so useHomeDashboard can pick it up immediately
                  if (!callStore.activeCall || callStore.activeCall.sessionId !== payload.sessionId) {
                    callStore.setActiveCall({
                      sessionId: payload.sessionId,
                      conversationId: payload.conversationId || null,
                      isGroupCall: payload.isGroupCall || false,
                      initiatedBy: payload.fromUserId,
                      participantIds: payload.participantIds || [payload.fromUserId],
                      joinedParticipantIds: [payload.fromUserId],
                      participantDisplayNames: {},
                      direction: 'incoming',
                      status: 'incoming',
                      callToken: payload.callToken,
                    });
                  }
                  
                  // Navigate to the chat to answer it
                  if (payload.conversationId) {
                    router.push(`/chat?conversationId=${payload.conversationId}`);
                  } else {
                    router.push(`/chat`);
                  }
                }}
              >
                Trả lời
              </button>
              <button 
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
                onClick={() => {
                  toast.dismiss(t.id);
                  // Auto reject
                  socket.emit('call_reject', {
                    sessionId: payload.sessionId,
                    reason: 'rejected',
                    callToken: payload.callToken
                  });
                  callStore.setActiveCall(null);
                }}
              >
                Từ chối
              </button>
            </div>
          </div>
        ), { 
          duration: 30000, 
          id: toastId,
          position: 'top-center'
        });
      };

      const handleCallStatus = (payload: any) => {
        if (payload.status === 'ended' || payload.status === 'missed' || payload.status === 'rejected' || payload.status === 'connecting' || payload.status === 'connected') {
          // If the call status changes to anything that means it's no longer "ringing", dismiss the toast
          toast.dismiss(`call-${payload.sessionId}`);
        }
      };

      socket.on('call_incoming', handleCallIncoming);
      socket.on('call_invited', handleCallIncoming); // For group calls
      socket.on('call_status', handleCallStatus);

      return () => {
        socket.off('call_incoming', handleCallIncoming);
        socket.off('call_invited', handleCallIncoming);
        socket.off('call_status', handleCallStatus);
      };
    } catch {}
  }, [router, pathname]);

  return null;
}
