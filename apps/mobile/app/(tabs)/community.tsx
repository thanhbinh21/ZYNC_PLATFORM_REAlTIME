import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { ExploreContent } from '../explore';

const FILTERS: { key: PostFilter; label: string }[] = [
  { key: 'latest', label: 'Mới nhất' },
  { key: 'trending', label: 'Thu hút' },
  { key: 'question', label: 'Hỏi đáp' },
  { key: 'til', label: 'TIL' },
];

type CommunityTab = 'posts' | 'discover';

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
  const [activeTab, setActiveTab] = useState<CommunityTab>('posts');

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cộng đồng</Text>
        {activeTab === 'posts' && (
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            style={styles.createButton}
          >
            <Pencil size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.mainTabRow}>
        <TouchableOpacity
          onPress={() => setActiveTab('posts')}
          style={[styles.mainTab, activeTab === 'posts' && styles.mainTabActive]}
        >
          <Text style={[styles.mainTabText, activeTab === 'posts' && styles.mainTabTextActive]}>
            Bài viết
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('discover')}
          style={[styles.mainTab, activeTab === 'discover' && styles.mainTabActive]}
        >
          <Text style={[styles.mainTabText, activeTab === 'discover' && styles.mainTabTextActive]}>
            Khám phá
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'discover' ? (
        <ExploreContent showHeader={false} />
      ) : (
      <>

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
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
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
      </>
      )}
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
  mainTabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 4,
    borderRadius: 14,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  mainTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    paddingVertical: 9,
  },
  mainTabActive: {
    backgroundColor: colors.primary,
  },
  mainTabText: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  mainTabTextActive: {
    color: colors.textOnAccent,
    fontFamily: fonts.bold,
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
    color: colors.textOnAccent,
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
