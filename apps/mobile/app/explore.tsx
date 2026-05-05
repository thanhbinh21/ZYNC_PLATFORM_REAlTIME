import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Image,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Search, TrendingUp, Users, Hash } from 'lucide-react-native';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';
import { getAppTheme } from '../../src/theme/get-app-theme';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';
import { ChannelCard } from '../../src/components/ChannelCard';
import { DeveloperCard } from '../../src/components/DeveloperCard';
import { useExplore } from '../../src/hooks/useExplore';
import { fetchTrendingPosts, type Post } from '../../src/services/posts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ExploreScreen() {
  const router = useRouter();
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);

  const {
    channels,
    users,
    isLoadingChannels,
    isLoadingUsers,
    isJoining,
    error,
    loadChannels,
    loadUsers,
    handleJoinChannel,
  } = useExplore();

  const [searchQuery, setSearchQuery] = useState('');
  const [trendingPosts, setTrendingPosts] = useState<Post[]>([]);
  const [isLoadingTrending, setIsLoadingTrending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    await Promise.all([loadChannels(), loadUsers()]);
  }, [loadChannels, loadUsers]);

  const loadTrending = useCallback(async () => {
    try {
      setIsLoadingTrending(true);
      const data = await fetchTrendingPosts(10);
      setTrendingPosts(data);
    } catch {
      // ignore trending errors
    } finally {
      setIsLoadingTrending(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    loadTrending();
  }, [loadAll, loadTrending]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([loadAll(), loadTrending()]);
    setIsRefreshing(false);
  }, [loadAll, loadTrending]);

  const handlePostPress = useCallback(
    (post: Post) => {
      router.push({ pathname: '/post-detail', params: { postId: post._id } });
    },
    [router]
  );

  const handleChannelPress = useCallback((channelId: string) => {
    // Navigate to channel detail if needed
  }, []);

  const filteredChannels = searchQuery
    ? channels.filter(
        (ch) =>
          ch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ch.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : channels;

  const filteredUsers = searchQuery
    ? users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.skills?.some((s) =>
            s.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    : users;

  const hasContent =
    !isLoadingChannels && !isLoadingUsers && channels.length === 0 && users.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kham pha</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* Search bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={colors.textSubtle} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tim kenh, nguoi dung..."
            placeholderTextColor={colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Loading state */}
        {(isLoadingChannels || isLoadingUsers) && !isRefreshing && (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* Empty state */}
        {hasContent && !searchQuery && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Chua co noi dung nao</Text>
            <Text style={styles.emptySubtitle}>
              Danh sach kenh va nguoi dung se xuat hien o day
            </Text>
          </View>
        )}

        {/* Channels section */}
        {!isLoadingChannels && filteredChannels.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Hash size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Kenh pho bien</Text>
            </View>
            {filteredChannels.map((channel) => (
              <ChannelCard
                key={channel._id}
                channel={channel}
                isJoining={isJoining === channel._id}
                onJoin={handleJoinChannel}
              />
            ))}
          </View>
        )}

        {/* Trending posts */}
        {!isLoadingTrending && trendingPosts.length > 0 && !searchQuery && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <TrendingUp size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Bai viet noi bat</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingRow}
            >
              {trendingPosts.map((post) => (
                <TouchableOpacity
                  key={post._id}
                  onPress={() => handlePostPress(post)}
                  style={styles.trendingCard}
                >
                  <View style={styles.trendingCardHeader}>
                    {post.author?.avatarUrl ? (
                      <Image
                        source={{ uri: post.author.avatarUrl }}
                        style={styles.trendingAvatar}
                      />
                    ) : (
                      <View
                        style={[
                          styles.trendingAvatar,
                          styles.trendingAvatarFallback,
                        ]}
                      >
                        <Text style={styles.trendingAvatarText}>
                          {(post.author?.displayName || 'U')
                            .slice(0, 1)
                            .toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.trendingAuthor} numberOfLines={1}>
                      {post.author?.displayName || 'Nguoi dung'}
                    </Text>
                  </View>
                  <Text style={styles.trendingTitle} numberOfLines={2}>
                    {post.title}
                  </Text>
                  <View style={styles.trendingStats}>
                    <Text style={styles.trendingStat}>
                      {post.likesCount} thich
                    </Text>
                    <Text style={styles.trendingStat}>
                      {post.commentsCount} binh luan
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Users section */}
        {!isLoadingUsers && filteredUsers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Users size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>Developer noi bat</Text>
            </View>
            {filteredUsers.map((user) => (
              <DeveloperCard
                key={user.id}
                user={user}
                onMessage={(userId) => {
                  // Navigate to chat with user
                }}
                onAddFriend={(userId) => {
                  // Send friend request
                }}
              />
            ))}
          </View>
        )}

        {/* Search results empty */}
        {searchQuery &&
          filteredChannels.length === 0 &&
          filteredUsers.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Khong tim thay ket qua</Text>
              <Text style={styles.emptySubtitle}>
                Thuử tu kho tim kiem khac
              </Text>
            </View>
          )}

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 24,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
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
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 17,
  },
  trendingRow: {
    paddingRight: 4,
    gap: 12,
  },
  trendingCard: {
    width: 200,
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 16,
    padding: 14,
  },
  trendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  trendingAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  trendingAvatarFallback: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingAvatarText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 11,
  },
  trendingAuthor: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 12,
    flex: 1,
  },
  trendingTitle: {
    color: colors.text,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  trendingStats: {
    flexDirection: 'row',
    gap: 12,
  },
  trendingStat: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 12,
  },
  bottomPadding: {
    height: 120,
  },
});
