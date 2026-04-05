'use client';

import { useEffect, useMemo, useState } from 'react';
import { HomeDashboardScreen } from '@/components/home-dashboard/organisms/home-dashboard-screen';
import { HomeDashboardChatPanel } from '@/components/home-dashboard/organisms/home-dashboard-chat-panel';
import { HomeDashboardProfilePanel } from '@/components/home-dashboard/organisms/home-dashboard-profile-panel';
import {
  HomeDashboardSettingsPanel,
  type DashboardAppearanceSettings,
} from '@/components/home-dashboard/organisms/home-dashboard-settings-panel';
import { StoryBar } from '@/components/stories/organisms/StoryBar';
import { StoryViewer } from '@/components/stories/organisms/StoryViewer';
import { StoryCreateModal } from '@/components/stories/molecules/StoryCreateModal';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useStories } from '@/hooks/use-stories';
import { fetchMyProfile, type MeUser } from '@/services/users';
import type { StoryReactionType, StoryFeedGroup } from '@/components/stories/stories.types';

const DEFAULT_APPEARANCE_SETTINGS: DashboardAppearanceSettings = {
  theme: 'verdant',
  messageFontSize: 'medium',
};

export default function HomePage() {
  const {
    data,
    loading,
    userId,
    conversations,
    selectedConversationId,
    onSelectConversation,
    messages,
    messagesLoading,
    conversationInfo,
    typingUsers,
    friendsForGroup,
    groupActionLoading,
    onCreateGroup,
    onAddGroupMembers,
    onUpdateGroupMemberRole,
    onRemoveGroupMember,
    onDisbandGroup,
    onSendMessage,
    onStartTyping,
    onStopTyping,
    onLoadMore,
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

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerGroupIdx, setViewerGroupIdx] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeNavId, setActiveNavId] = useState('chat');
  const [profile, setProfile] = useState<MeUser | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [appearanceSettings, setAppearanceSettings] =
    useState<DashboardAppearanceSettings>(DEFAULT_APPEARANCE_SETTINGS);

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
      savedTheme === 'verdant' || savedTheme === 'dark' || savedTheme === 'light'
        ? savedTheme
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
      <div className="flex min-h-screen items-center justify-center bg-[#021612]">
        <div className="text-[#30d7ab] animate-pulse">Đang tải trung tâm điều khiển...</div>
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

  const storySlot = isFeedLoading ? (
    <div className="flex gap-4 overflow-x-auto pb-2">
      <div className="h-16 w-16 animate-pulse rounded-full bg-[#0d3228]" />
      <div className="h-16 w-16 animate-pulse rounded-full bg-[#0d3228]" />
      <div className="h-16 w-16 animate-pulse rounded-full bg-[#0d3228]" />
    </div>
  ) : (
    <StoryBar
      feed={feed}
      myStories={myStories}
      currentUserId={userId}
      currentUserName={data.user.displayName}
      onViewStory={handleOpenViewer}
      onViewMyStory={handleViewMyStory}
      onCreateStory={() => setCreateOpen(true)}
    />
  );

  return (
    <>
      <HomeDashboardScreen
        data={data}
        chatSlot={
          <HomeDashboardChatPanel
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={onSelectConversation}
            friends={friendsForGroup}
            onCreateGroup={onCreateGroup}
            onAddGroupMembers={onAddGroupMembers}
            onUpdateGroupMemberRole={onUpdateGroupMemberRole}
            onRemoveGroupMember={onRemoveGroupMember}
            onDisbandGroup={onDisbandGroup}
            isCreatingGroup={groupActionLoading}
            onLoadMore={onLoadMore}
            chatPanelProps={{
              conversationId: selectedConversationId,
              currentUserId: userId,
              participantName: conversationInfo?.participantName,
              participantAvatar: conversationInfo?.participantAvatar,
              isOnline: conversationInfo?.isOnline,
              messages: messages,
              typingUsers: typingUsers,
              isLoading: messagesLoading,
              onSendMessage: onSendMessage,
              onStartTyping: onStartTyping,
              onStopTyping: onStopTyping,
            }}
          />
        }
        settingsSlot={
          <HomeDashboardSettingsPanel
            appearance={appearanceSettings}
            onApplyAppearance={handleApplyAppearance}
            onResetAppearance={handleResetAppearance}
          />
        }
        storySlot={storySlot}
        activeNavId={activeNavId}
        onNavSelect={handleNavSelect}
        profileSlot={
          <HomeDashboardProfilePanel
            profile={profile}
            loading={profileLoading}
            error={profileError}
            stories={data.stories}
            onOpenCreateStory={() => setCreateOpen(true)}
            onProfileUpdated={(updatedProfile) => setProfile(updatedProfile)}
          />
        }
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
