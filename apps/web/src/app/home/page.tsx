'use client';

import { useEffect, useMemo, useState } from 'react';
import { HomeDashboardScreen } from '@/components/home-dashboard/organisms/home-dashboard-screen';
import { StoryBar } from '@/components/stories/organisms/StoryBar';
import { StoryViewer } from '@/components/stories/organisms/StoryViewer';
import { StoryCreateModal } from '@/components/stories/molecules/StoryCreateModal';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useStories } from '@/hooks/use-stories';
import type { StoryReactionType, StoryFeedGroup } from '@/components/stories/stories.types';

export default function HomePage() {
  const { data, loading, userId } = useHomeDashboard();
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

  useEffect(() => {
    if (userId) {
      loadFeed();
      loadMyStories();
    }
  }, [userId, loadFeed, loadMyStories]);

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
      <HomeDashboardScreen data={data} storySlot={storySlot} />

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
