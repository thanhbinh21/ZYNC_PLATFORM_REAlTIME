import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';

import { lightTheme } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import { PostCard } from '../../src/components/PostCard';
import { CreatePostSheet } from '../../src/components/CreatePostSheet';
import { usePosts, type PostFilter } from '../../src/hooks/usePosts';
import { SkeletonPostCardPreset } from '../../src/ui/ZyncSkeleton';
import { EmptyState } from '../../src/ui/EmptyState';
import { ProfileBottomSheet } from '../../src/components/ProfileBottomSheet';
import { useNavigationFlow } from '../../src/hooks/useNavigationFlow';
import { AppScreen } from '../../src/ui/AppScreen';
import { AppChip } from '../../src/ui/AppChip';
import { AppIconButton } from '../../src/ui/AppIconButton';
import { useAuthStore } from '../../src/store/useAuthStore';

const FILTERS: { key: PostFilter; label: string }[] = [
  { key: 'latest', label: 'Mới nhất' },
  { key: 'trending', label: 'Thu hút' },
  { key: 'question', label: 'Hỏi đáp' },
  { key: 'til', label: 'Hướng dẫn' },
];

export default function CommunityScreen() {
  const router = useRouter();
  const theme = lightTheme;
  const currentUserId = useAuthStore((s) => s.userInfo?._id) ?? '';

  const {
    posts,
    isLoading,
    isLoadingMore,
    hasMore,
    filter,
    error,
    loadPosts,
    loadMore,
    changeFilter,
    handleCreatePost,
    handleLikePost,
    handleBookmarkPost,
  } = usePosts({ initialFilter: 'latest' });

  const {
    navigateToChat,
    profileSheetUserId,
    profileSheetOpen,
    profileSheetUser,
    profileSheetLoading,
    openProfileSheet,
    closeProfileSheet,
  } = useNavigationFlow();

  const [showCreate, setShowCreate] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadPosts();
  }, []);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadPosts(true);
    setIsRefreshing(false);
  }, [loadPosts]);

  const handlePostPress = useCallback(
    (post: { _id: string }) => {
      router.push({ pathname: '/post-detail', params: { postId: post._id } });
    },
    [router]
  );

  const handleCreateSubmit = useCallback(
    async (payload: Parameters<typeof handleCreatePost>[0]) => {
      await handleCreatePost(payload);
    },
    [handleCreatePost]
  );

  const handleAuthorPress = useCallback(
    (authorId: string) => {
      void openProfileSheet(authorId);
    },
    [openProfileSheet]
  );

  return (
    <AppScreen disableBottomSafeArea>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cộng đồng</Text>
        <AppIconButton
          icon={<Pencil size={20} color={lightTheme.accent} />}
          onPress={() => setShowCreate(true)}
          size={40}
        />
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {FILTERS.map((f) => (
            <AppChip
              key={f.key}
              label={f.label}
              active={filter === f.key}
              onPress={() => changeFilter(f.key)}
            />
          ))}
        </ScrollView>
      </View>

      {/* Post list */}
      <FlatList
        data={posts}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onPress={handlePostPress}
            onLike={handleLikePost}
            onBookmark={handleBookmarkPost}
            onAuthorPress={handleAuthorPress}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={lightTheme.accent}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              color={lightTheme.accent}
              style={styles.loadingMore}
            />
          ) : null
        }
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState variant="no-posts" />
          ) : null
        }
      />

      {isLoading && !isRefreshing && (
        <View style={styles.loadingOverlay}>
          <View style={{ gap: 12, width: '100%', padding: 16 }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonPostCardPreset key={i} />
            ))}
          </View>
        </View>
      )}

      <CreatePostSheet
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreateSubmit}
      />

      <ProfileBottomSheet
        visible={profileSheetOpen}
        userId={profileSheetUserId}
        currentUserId={currentUserId}
        onClose={closeProfileSheet}
        onSendMessage={(userId) => { void navigateToChat(userId); }}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: lightTheme.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightTheme.surfaceCard,
    borderWidth: 1,
    borderColor: lightTheme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: lightTheme.border,
    backgroundColor: lightTheme.bgSecondary,
  },
  filterTabActive: {
    backgroundColor: lightTheme.accent,
    borderColor: lightTheme.accent,
  },
  filterText: {
    color: lightTheme.textSecondary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  filterTextActive: {
    color: lightTheme.textPrimary,
    fontFamily: fonts.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 140, // Increased bottom padding so the bottom tab doesn't hide content
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    color: lightTheme.textPrimary,
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: lightTheme.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 14,
    textAlign: 'center',
  },
  loadingMore: {
    paddingVertical: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    inset: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
