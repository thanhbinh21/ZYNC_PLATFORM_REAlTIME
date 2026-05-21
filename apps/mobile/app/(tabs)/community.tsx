import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Pencil } from 'lucide-react-native';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';
import { getAppTheme } from '../../src/theme/get-app-theme';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import { PostCard } from '../../src/components/PostCard';
import { CreatePostSheet } from '../../src/components/CreatePostSheet';
import { usePosts, type PostFilter } from '../../src/hooks/usePosts';
import { SkeletonPostCardPreset } from '../../src/ui/ZyncSkeleton';
import { EmptyState } from '../../src/ui/EmptyState';
import { ProfileBottomSheet } from '../../src/components/ProfileBottomSheet';
import { useNavigationFlow } from '../../src/hooks/useNavigationFlow';
import { useAuthStore } from '../../src/store/useAuthStore';

const FILTERS: { key: PostFilter; label: string }[] = [
  { key: 'latest', label: 'Moi nhat' },
  { key: 'trending', label: 'Thu hut' },
  { key: 'question', label: 'Hoi dap' },
  { key: 'til', label: 'TIL' },
];

export default function CommunityScreen() {
  const router = useRouter();
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cong dong</Text>
        <TouchableOpacity
          onPress={() => setShowCreate(true)}
          style={styles.createButton}
        >
          <Pencil size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.key}
            onPress={() => changeFilter(f.key)}
            style={[
              styles.filterTab,
              filter === f.key && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.key && styles.filterTextActive,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
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
            tintColor={colors.primary}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingMore ? (
            <ActivityIndicator
              color={colors.primary}
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
    </SafeAreaView>
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
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorder,
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
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassSoft,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  filterTextActive: {
    color: colors.text,
    fontFamily: fonts.bold,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 18,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: colors.textSubtle,
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
