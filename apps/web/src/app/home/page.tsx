'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HomeDashboardScreen } from '@/components/home-dashboard/organisms/home-dashboard-screen';
import { HomeDashboardChatPanel } from '@/components/home-dashboard/organisms/home-dashboard-chat-panel';
import { HomeDashboardProfilePanel } from '@/components/home-dashboard/organisms/home-dashboard-profile-panel';
import {
  HomeDashboardSettingsPanel,
  type DashboardAppearanceSettings,
} from '@/components/home-dashboard/organisms/home-dashboard-settings-panel';
import { UserProfileModal } from '@/components/home-dashboard/molecules/user-profile-modal';
import { ForwardMessageModal } from '@/components/home-dashboard/molecules/forward-message-modal';
import { NotificationHub } from '@/components/home-dashboard/organisms/NotificationHub';
import { MessagePreviewPopup } from '@/components/home-dashboard/organisms/MessagePreviewPopup';
import { useMessagePreview } from '@/hooks/use-message-preview';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useLoginForm } from '@/hooks/use-login-form';
import { fetchMyProfile, type MeUser } from '@/services/users';
import FriendsPage from '../friends/page';
import CommunityContent from '../community/community-content';
import ExploreContent from '../explore/explore-content';

const DEFAULT_APPEARANCE_SETTINGS: DashboardAppearanceSettings = {
  theme: 'light',
  messageFontSize: 'medium',
};

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    data,
    loading,
    userId,
    conversations,
    selectedConversationId,
    onSelectConversation,
    searchTargets,
    onSelectSearchTarget,
    messages,
    messagesLoading,
    messagesHasMore,
    messageStatus,
    conversationInfo,
    typingUsers,
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
    onSendMessage,
    onCancelPendingMessage,
    onStartTyping,
    onStopTyping,
    onLoadMore,
    onPatchDashboardUser,
    onDeleteMessageForMe,
    onRecallMessage,
    onForwardMessage,
    onReactionUpsert,
    onReactionRemoveAllMine,
    onFetchReactionDetails,
    reactionUserStateByMessage,
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
    forwardModalOpen,
    forwardingMessage,
    forwardLoading,
    onCloseForwardModal,
    onExecuteForward,
    userPenaltyScore,
    userMutedUntil,
  } = useHomeDashboard();

  const {
    previews,
    dismissPreview,
    pauseDismiss,
    resumeDismiss,
    quickReply,
  } = useMessagePreview({
    selectedConversationId,
    conversations,
  });

  const { onLogout } = useLoginForm();

  const [activeNavId, setActiveNavId] = useState('home');
  const openNotificationsSignal = searchParams.get('openNotifications');
  const [profile, setProfile] = useState<MeUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [appearanceSettings, setAppearanceSettings] =
    useState<DashboardAppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = globalThis.localStorage?.getItem('zync.dashboard.theme');
    const savedFontSize = globalThis.localStorage?.getItem('zync.dashboard.messageFontSize');

    const theme =
      savedTheme === 'dark'
        ? 'dark'
        : savedTheme === 'light' || savedTheme === 'verdant'
          ? 'light'
          : DEFAULT_APPEARANCE_SETTINGS.theme;

    const messageFontSize =
      savedFontSize === 'small' || savedFontSize === 'medium' || savedFontSize === 'large'
        ? savedFontSize
        : DEFAULT_APPEARANCE_SETTINGS.messageFontSize;

    setAppearanceSettings({ theme, messageFontSize });
  }, []);

  useEffect(() => {
    document.documentElement.dataset['zyncTheme'] = appearanceSettings.theme;
    document.documentElement.dataset['zyncMessageSize'] = appearanceSettings.messageFontSize;
  }, [appearanceSettings.messageFontSize, appearanceSettings.theme]);

  // Expose current nav for global toast logic
  useEffect(() => {
    (globalThis as Record<string, unknown>)['__zyncActiveNavId'] = activeNavId;
  }, [activeNavId]);

  // Deep link support from in-app toast: /home?nav=chat&conversationId=...
  useEffect(() => {
    const nav = searchParams.get('nav');
    const conversationId = searchParams.get('conversationId');
    if (nav !== 'chat' || !conversationId) return;

    setActiveNavId('chat');
    onSelectConversation(conversationId);

    // Clean URL to avoid re-trigger on re-render/back-forward
    router.replace('/home');
  }, [onSelectConversation, router, searchParams]);

  // Kiểm tra onboarding và redirect nếu chưa hoàn thành
  useEffect(() => {
    if (!userId) return;
    fetchMyProfile()
      .then((p) => {
        if (!p.onboardingCompleted) {
          router.push('/onboarding');
        }
      })
      .catch(() => {/* ignore */});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Open notifications dropdown when requested (from summary toast)
  useEffect(() => {
    if (openNotificationsSignal !== '1') return;
    // Let NotificationHub open itself via prop signal; then clean URL.
    const t = setTimeout(() => {
      router.replace('/home');
    }, 0);
    return () => clearTimeout(t);
  }, [openNotificationsSignal, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="text-accent animate-pulse">Đang tải trung tâm điều khiển...</div>
      </div>
    );
  }

  const handleNavSelect = async (navId: string) => {
    setActiveNavId(navId);
    if (navId !== 'profile') return;

    setProfileLoading(true);
    setProfileError(null);
    try {
      const profileData = await fetchMyProfile();
      setProfile(profileData);
    } catch {
      setProfileError('Không thể lấy thông tin từ server. Vui lòng thử lại.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleApplyAppearance = (settings: DashboardAppearanceSettings) => {
    setAppearanceSettings(settings);
    globalThis.localStorage?.setItem('zync.dashboard.theme', settings.theme);
    globalThis.localStorage?.setItem('zync.dashboard.messageFontSize', settings.messageFontSize);
  };

  const handleToggleTheme = () => {
    const newTheme = appearanceSettings.theme === 'dark' ? 'light' : 'dark';
    handleApplyAppearance({ ...appearanceSettings, theme: newTheme });
  };

  const handleResetAppearance = () => {
    setAppearanceSettings(DEFAULT_APPEARANCE_SETTINGS);
    globalThis.localStorage?.setItem('zync.dashboard.theme', DEFAULT_APPEARANCE_SETTINGS.theme);
    globalThis.localStorage?.setItem(
      'zync.dashboard.messageFontSize',
      DEFAULT_APPEARANCE_SETTINGS.messageFontSize,
    );
  };

  return (
    <>
      <HomeDashboardScreen
        data={data}
        activeNavId={activeNavId}
        onNavSelect={handleNavSelect}
        theme={appearanceSettings.theme}
        onToggleTheme={handleToggleTheme}
        onActivityClick={(item) => {
          if (item.conversationId) {
            onSelectConversation(item.conversationId);
            setActiveNavId('chat');
          }
        }}
        onLogout={onLogout}
        notificationSlot={
          <NotificationHub
            openSignal={openNotificationsSignal}
            onNavigate={(n) => {
              if (n.type === 'friend_request' || n.type === 'friend_accepted') {
                router.push('/friends');
                return;
              }
              if (n.conversationId) {
                onSelectConversation(n.conversationId);
                setActiveNavId('chat');
              }
            }}
          />
        }
        chatSlot={
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
                setActiveNavId('chat');
              }}
            />
          </div>
        }
        settingsSlot={
          <HomeDashboardSettingsPanel
            appearance={appearanceSettings}
            onApplyAppearance={handleApplyAppearance}
            onResetAppearance={handleResetAppearance}
          />
        }
        storySlot={undefined}
        onViewUserProfile={(uid) => setProfileViewUserId(uid)}
        profileSlot={
          <HomeDashboardProfilePanel
            profile={profile}
            loading={profileLoading}
            error={profileError}
            syncedPenaltyScore={userPenaltyScore}
            friends={friendsForGroup}
          />
        }
        friendsSlot={<FriendsPage />}
        communitySlot={<CommunityContent />}
        exploreSlot={<ExploreContent />}
      />

      <UserProfileModal
        userId={profileViewUserId}
        onClose={() => setProfileViewUserId(null)}
      />

      <ForwardMessageModal
        open={forwardModalOpen}
        message={forwardingMessage}
        conversations={conversations.map((conv) => ({
          _id: conv.id,
          name: conv.name,
          avatarUrl: conv.avatarUrl,
          type: conv.isGroup ? 'group' : 'direct',
          users: conv.members || [],
        }))}
        currentConversationId={selectedConversationId}
        isLoading={forwardLoading}
        onClose={onCloseForwardModal}
        onForward={(message, toConversationId) => onExecuteForward(toConversationId)}
      />
    </>
  );
}
