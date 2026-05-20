'use client';

import { Suspense } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HomeDashboardProfilePanel } from '@/components/home-dashboard/organisms/home-dashboard-profile-panel';
import { StoryCreateModal } from '@/components/stories/molecules/StoryCreateModal';
import { StoryViewer } from '@/components/stories/organisms/StoryViewer';
import { useStories } from '@/hooks/use-stories';
import { profileStore, subscribeToProfileStore } from '@/stores/profile-store';
import { PageLoading } from '@/components/shared/page-loading';
import { ZyncPageTransition } from '@/components/shared/ZyncPageTransition';
import type { CreateStoryPayload } from '@/services/stories';
import type { MeUser } from '@/services/users';
import type { StoryReactionType } from '@/components/stories/stories.types';

export default function ProfilePage() {
  return (
    <Suspense fallback={<PageLoading variant="profile" mode="panel" />}>
      <ZyncPageTransition className="flex h-full w-full min-h-0 min-w-0 flex-1 flex-col">
        <ProfilePageContent />
      </ZyncPageTransition>
    </Suspense>
  );
}

function ProfilePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<MeUser | null>(profileStore.profile);
  const [loading, setLoading] = useState(profileStore.isLoading || !profileStore.isReady);
  const [isCreateStoryOpen, setIsCreateStoryOpen] = useState(false);
  const [isStoryViewerOpen, setIsStoryViewerOpen] = useState(false);
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null);
  const storyAutoOpenRef = useRef(false);

  const {
    feed,
    myStories,
    loadFeed,
    loadMyStories,
    onCreate,
    onDelete,
    onView,
    onReact,
    onReply,
  } = useStories();

  const initialTab = searchParams.get('tab') === 'stories' ? 'stories' : 'info';
  const requestedStoryId = searchParams.get('storyId') ?? undefined;

  useEffect(() => {
    void profileStore.load();
  }, []);

  useEffect(() => {
    const unsub = subscribeToProfileStore((nextProfile, isLoading, isReady) => {
      setProfile(nextProfile);
      setLoading(isLoading || !isReady);
    });
    return unsub;
  }, []);

  useEffect(() => {
    void loadFeed();
    void loadMyStories();
  }, [loadFeed, loadMyStories]);

  useEffect(() => {
    storyAutoOpenRef.current = false;
  }, [requestedStoryId]);

  useEffect(() => {
    if (!requestedStoryId || storyAutoOpenRef.current || feed.length === 0) {
      return;
    }

    const index = feed.findIndex((group) =>
      group.stories.some((story) => story._id === requestedStoryId),
    );

    if (index >= 0) {
      setStoryViewerIndex(index);
      setIsStoryViewerOpen(true);
      storyAutoOpenRef.current = true;
    }
  }, [feed, requestedStoryId]);

  const handleProfileUpdated = (updated: MeUser) => {
    profileStore.setProfile(updated);
  };

  const handleViewStoryFeed = (index: number) => {
    setStoryViewerIndex(index);
    setIsStoryViewerOpen(true);
  };

  const handleCreateStory = async (payload: CreateStoryPayload) => {
    const created = await onCreate(payload);
    if (created) {
      void loadMyStories();
      void loadFeed();
    }
  };

  const handleStoryReaction = async (storyId: string, emoji: StoryReactionType) => {
    await onReact(storyId, emoji);
  };

  const handleStoryReply = async (storyId: string, content: string) => {
    const result = await onReply(storyId, content);
    if (result?.conversationId) {
      router.push(`/chat?conversationId=${result.conversationId}`);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
      <HomeDashboardProfilePanel
        profile={profile}
        loading={loading}
        error={null}
        feed={feed}
        myStories={myStories}
        initialTab={initialTab === 'info' ? initialTab : undefined}
        onProfileUpdated={handleProfileUpdated}
        onOpenCreateStory={() => setIsCreateStoryOpen(true)}
        onViewStoryFeed={handleViewStoryFeed}
      />

      <StoryCreateModal
        open={isCreateStoryOpen}
        onClose={() => setIsCreateStoryOpen(false)}
        onSubmit={handleCreateStory}
      />

      {isStoryViewerOpen && storyViewerIndex !== null && profile && feed.length > 0 && (
        <StoryViewer
          feed={feed}
          initialGroupIndex={storyViewerIndex}
          currentUserId={profile._id}
          onClose={() => setIsStoryViewerOpen(false)}
          onReact={handleStoryReaction}
          onReply={handleStoryReply}
          onView={onView}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
