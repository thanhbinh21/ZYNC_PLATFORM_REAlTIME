'use client';

import { useEffect, useState } from 'react';
import { HomeDashboardScreen } from '@/components/home-dashboard/organisms/home-dashboard-screen';
import { StoryBar } from '@/components/stories/organisms/StoryBar';
import { StoryViewer } from '@/components/stories/organisms/StoryViewer';
import { StoryCreateModal } from '@/components/stories/molecules/StoryCreateModal';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';
import { useStories } from '@/hooks/use-stories';
import type { StoryReactionType } from '@/components/stories/stories.types';

export default function HomePage() {
  const { data, loading, userId } = useHomeDashboard();
  const {
    feed,
    myStories,
    isLoading: storiesLoading,
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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#021612]">
        <div className="text-[#30d7ab] animate-pulse">Đang tải trung tâm điều khiển...</div>
      </div>
    );
  }

  const handleOpenViewer = (groupIndex: number) => {
    setViewerGroupIdx(groupIndex);
    setViewerOpen(true);
  };

  const storySlot = (
    <>
      <StoryBar
        feed={feed}
        myStories={myStories}
        currentUserId={userId}
        onViewStory={handleOpenViewer}
        onCreateStory={() => setCreateOpen(true)}
      />
    </>
  );

  return (
    <>
      <HomeDashboardScreen data={data} storySlot={!storiesLoading && feed.length > 0 ? storySlot : undefined} />

      {viewerOpen && feed.length > 0 && (
        <StoryViewer
          feed={feed}
          initialGroupIndex={viewerGroupIdx}
          currentUserId={userId}
          onClose={() => setViewerOpen(false)}
          onReact={(storyId, emoji) => onReact(storyId, emoji as StoryReactionType)}
          onReply={onReply}
          onView={onView}
          onDelete={(storyId) => { onDelete(storyId); }}
        />
      )}

      <StoryCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload) => {
          await onCreate(payload);
          loadFeed();
        }}
      />
    </>
  );
}
