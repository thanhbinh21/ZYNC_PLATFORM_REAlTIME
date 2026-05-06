'use client';

import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useMessagePreview } from '@/hooks/use-message-preview';
import { HomeDashboardChatPanel } from '@/components/home-dashboard/organisms/home-dashboard-chat-panel';
import { MessagePreviewPopup } from '@/components/home-dashboard/organisms/MessagePreviewPopup';
import { PageLoading } from '@/components/shared/page-loading';

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    loading,
    conversations,
    selectedConversationId,
    onSelectConversation,
    searchTargets,
    onSelectSearchTarget,
    friendsForGroup,
    groupActionLoading,
    onCreateGroup,
    onUpdateGroup,
    onAddGroupMembers,
    onUpdateGroupMemberRole,
    onUpdateGroupMemberApproval,
    onRemoveGroupMember,
    onDisbandGroup,
    onLeaveGroup,
    onToggleConversationPin,
    onMuteConversation,
    onUnmuteConversation,
    isSelectedConversationPinned,
    selectedConversationMutedUntil,
    messages,
    messagesLoading,
    messagesHasMore,
    messageStatus,
    conversationInfo,
    typingUsers,
    onSendMessage,
    onCancelPendingMessage,
    onStartTyping,
    onStopTyping,
    onLoadMore,
    onDeleteMessageForMe,
    onRecallMessage,
    onForwardMessage,
    onReactionUpsert,
    onReactionRemoveAllMine,
    onFetchReactionDetails,
    reactionUserStateByMessage,
    userId,
    forwardModalOpen,
    forwardingMessage,
    forwardLoading,
    onCloseForwardModal,
    onExecuteForward,
    callStatus,
    callPeerName,
    callParticipantNames,
    isGroupCallActive,
    callError,
    isMicMuted,
    isCameraEnabled,
    isScreenSharing,
    localVideoRef,
    remoteVideoRef,
    remoteParticipantVideos,
    isCallingAvailable,
    onStartVideoCall,
    onAcceptIncomingCall,
    onRejectIncomingCall,
    onEndCall,
    onDismissCallUi,
    onToggleMic,
    onToggleCamera,
    onToggleScreenShare,
    userPenaltyScore,
    userMutedUntil,
  } = useHomeDashboard();

  const { previews, dismissPreview, pauseDismiss, resumeDismiss, quickReply } = useMessagePreview({
    selectedConversationId,
    conversations,
  });

  // Deep link support from in-app toast: /chat?conversationId=...
  useEffect(() => {
    const conversationId = searchParams.get('conversationId');
    if (!conversationId) return;

    onSelectConversation(conversationId);
    router.replace('/chat');
  }, [searchParams, onSelectConversation, router]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <PageLoading />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full min-h-0 min-w-0 flex-1">
      <HomeDashboardChatPanel
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={onSelectConversation}
        searchTargets={searchTargets}
        onSelectSearchTarget={onSelectSearchTarget}
        friends={friendsForGroup}
        onCreateGroup={onCreateGroup}
        onUpdateGroup={onUpdateGroup}
        onAddGroupMembers={onAddGroupMembers}
        onUpdateGroupMemberRole={onUpdateGroupMemberRole}
        onUpdateGroupMemberApproval={onUpdateGroupMemberApproval}
        onRemoveGroupMember={onRemoveGroupMember}
        onDisbandGroup={onDisbandGroup}
        onLeaveGroup={onLeaveGroup}
        onToggleConversationPin={onToggleConversationPin}
        onMuteConversation={onMuteConversation}
        onUnmuteConversation={onUnmuteConversation}
        isConversationPinned={isSelectedConversationPinned}
        conversationMutedUntil={selectedConversationMutedUntil}
        isCreatingGroup={groupActionLoading}
        onLoadMore={onLoadMore}
        chatPanelProps={{
          conversationId: selectedConversationId,
          currentUserId: userId,
          participantName: conversationInfo?.participantName,
          participantAvatar: conversationInfo?.participantAvatar,
          participantAvatarUrl: conversationInfo?.participantAvatarUrl,
          isOnline: conversationInfo?.isOnline,
          messages: messages,
          messageStatus: messageStatus,
          typingUsers: typingUsers,
          isLoading: messagesLoading,
          hasMoreMessages: messagesHasMore,
          onSendMessage: onSendMessage,
          onCancelPendingMessage: onCancelPendingMessage,
          onStartTyping: onStartTyping,
          onStopTyping: onStopTyping,
          onDeleteMessageForMe: onDeleteMessageForMe,
          onRecallMessage: onRecallMessage,
          onForwardMessage: onForwardMessage,
          onReactionUpsert: onReactionUpsert,
          onReactionRemoveAllMine: onReactionRemoveAllMine,
          onFetchReactionDetails: onFetchReactionDetails,
          reactionUserStateByMessage: reactionUserStateByMessage,
          callStatus: callStatus,
          callPeerName: callPeerName,
          callParticipantNames: callParticipantNames,
          isGroupCallActive: isGroupCallActive,
          callError: callError,
          isMicMuted: isMicMuted,
          isCameraEnabled: isCameraEnabled,
          isScreenSharing: isScreenSharing,
          localVideoRef: localVideoRef,
          remoteVideoRef: remoteVideoRef,
          remoteParticipantVideos: remoteParticipantVideos,
          isCallingAvailable: isCallingAvailable,
          onStartVideoCall: onStartVideoCall,
          onAcceptIncomingCall: onAcceptIncomingCall,
          onRejectIncomingCall: onRejectIncomingCall,
          onEndCall: onEndCall,
          onDismissCallBanner: onDismissCallUi,
          onToggleMic: onToggleMic,
          onToggleCamera: onToggleCamera,
          onToggleScreenShare: onToggleScreenShare,
          userPenaltyScore: userPenaltyScore,
          userMutedUntil: userMutedUntil,
        }}
      />
      <MessagePreviewPopup
        previews={previews}
        onDismiss={dismissPreview}
        onPauseDismiss={pauseDismiss}
        onResumeDismiss={resumeDismiss}
        onQuickReply={quickReply}
        onNavigate={(conversationId) => {
          onSelectConversation(conversationId);
        }}
      />
    </div>
  );
}
