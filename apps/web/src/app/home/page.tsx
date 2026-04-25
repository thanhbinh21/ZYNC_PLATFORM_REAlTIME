'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { StoryBar } from '@/components/stories/organisms/StoryBar';
import { StoryViewer } from '@/components/stories/organisms/StoryViewer';
import { StoryHighlights } from '@/components/stories/organisms/StoryHighlights';
import { StoryCreateModal } from '@/components/stories/molecules/StoryCreateModal';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useStories } from '@/hooks/use-stories';
import { useLoginForm } from '@/hooks/use-login-form';
import { fetchMyProfile, type MeUser } from '@/services/users';
import type { StoryReactionType, StoryFeedGroup, StoryHighlight } from '@/components/stories/stories.types';
import FriendsPage from '../friends/page';

const DEFAULT_APPEARANCE_SETTINGS: DashboardAppearanceSettings = {
  theme: 'light',
  messageFontSize: 'medium',
};

export default function HomePage() {
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
    feed,
    myStories,
    isFeedLoading,
    loadFeed,
    loadMyStories,
    onCreate,
    onDelete,
    onView,
    onReact,
    onReply,
  } = useStories();

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

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState('chat');
  const openNotificationsSignal = searchParams.get('openNotifications');
  const [profile, setProfile] = useState<MeUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [appearanceSettings, setAppearanceSettings] =
    useState<DashboardAppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);
  const [profileViewUserId, setProfileViewUserId] = useState<string | null>(null);

  useEffect(() => {
    if (userId) {
      loadFeed();
      loadMyStories();
    }
  }, [userId, loadFeed, loadMyStories]);

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

  // Open notifications dropdown when requested (from summary toast)
  useEffect(() => {
    if (openNotificationsSignal !== '1') return;
    // Let NotificationHub open itself via prop signal; then clean URL.
    const t = setTimeout(() => {
      router.replace('/home');
    }, 0);
    return () => clearTimeout(t);
  }, [openNotificationsSignal, router]);

  const allFeed: StoryFeedGroup[] = useMemo(() => {
    const groups: StoryFeedGroup[] = [];
    if (myStories.length > 0) {
      groups.push({
        userId,
        displayName: data.user.displayName,
        stories: myStories.map((s) => ({
          _id: s._id,
          userId: s.userId,
          mediaType: s.mediaType as StoryFeedGroup['stories'][number]['mediaType'],
          mediaUrl: s.mediaUrl,
          content: s.content,
          backgroundColor: s.backgroundColor,
          fontStyle: s.fontStyle,
          viewerIds: s.viewerIds,
          reactions: s.reactions,
          expiresAt: s.expiresAt,
          createdAt: s.createdAt,
        })),
      });
    }
    groups.push(...feed);
    return groups;
  }, [myStories, feed, userId, data.user.displayName]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-primary">
        <div className="text-accent animate-pulse">Đang tải trung tâm điều khiển...</div>
      </div>
    );
  }

  const myStoryGroupOffset = myStories.length > 0 ? 1 : 0;

  const handleNavSelect = async (navId: string) => {
    setActiveNavId(navId);
    if (navId !== 'profile') return;

    setProfileLoading(true);
    setProfileError(null);
    try {
      const profileData = await fetchMyProfile();
      setProfile(profileData);
    } catch {
      setProfileError('Khong the lay thong tin tu server. Vui long thu lai.');
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

  const handleOpenViewer = (feedIndex: number) => {
    setViewerGroupIdx(feedIndex + myStoryGroupOffset);
    setViewerOpen(true);
  };

  const handleViewMyStory = () => {
    setViewerGroupIdx(0);
    setViewerOpen(true);
  };

  // Mock highlights (replace with real API data when available)
  const highlights: StoryHighlight[] = [];

  const storySlot = (
    <div className="space-y-2">
      {isFeedLoading && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          <div className="h-16 w-16 animate-pulse rounded-full bg-bg-hover" />
          <div className="h-16 w-16 animate-pulse rounded-full bg-bg-hover" />
          <div className="h-16 w-16 animate-pulse rounded-full bg-bg-hover" />
        </div>
      )}

      <StoryBar
        feed={feed}
        myStories={myStories}
        currentUserId={userId}
        currentUserName={data.user.displayName}
        loading={isFeedLoading}
        onViewStory={handleOpenViewer}
        onViewMyStory={handleViewMyStory}
        onCreateStory={() => setCreateOpen(true)}
      />
      {highlights.length > 0 && (
        <StoryHighlights highlights={highlights} onViewHighlight={() => {}} />
      )}
    </div>
  );

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
        storySlot={storySlot}
        onViewUserProfile={(uid) => setProfileViewUserId(uid)}
        profileSlot={
          <HomeDashboardProfilePanel
            profile={profile}
            loading={profileLoading}
            error={profileError}
            myStories={myStories}
            feed={feed}
            friends={friendsForGroup}
            onOpenCreateStory={() => setCreateOpen(true)}
            onViewStoryFeed={(feedIndex) => {
              setViewerGroupIdx(feedIndex + myStoryGroupOffset);
              setViewerOpen(true);
            }}
            onViewUserProfile={(uid) => setProfileViewUserId(uid)}
            onProfileUpdated={(updatedProfile) => {
              setProfile(updatedProfile);
              onPatchDashboardUser({
                displayName: updatedProfile.displayName,
                avatarUrl: updatedProfile.avatarUrl,
              });
            }}
          />
        }
        friendsSlot={<FriendsPage />}
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

      {viewerOpen && allFeed.length > 0 && (
        <StoryViewer
          feed={allFeed}
          initialGroupIndex={viewerGroupIdx}
          currentUserId={userId}
          onClose={() => setViewerOpen(false)}
          onReact={(storyId, emoji) => onReact(storyId, emoji as StoryReactionType)}
          onReply={onReply}
          onView={onView}
          onDelete={(storyId) => {
            onDelete(storyId);
            loadMyStories();
          }}
          onShare={() => { /* TODO: implement share */ }}
        />
      )}

      <StoryCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await onCreate(payload);
          await Promise.all([loadFeed(), loadMyStories()]);
        }}
      />
    </>
  );
}
