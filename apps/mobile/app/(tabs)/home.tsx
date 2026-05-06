import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Users,
  MessageCircle,
  Mail,
  Compass,
  AddCircle,
  Globe,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Zap,
  Calendar,
} from 'lucide-react-native';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/fonts';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';
import { getAppTheme } from '../../src/theme/get-app-theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import api from '../../src/services/api';
import { useNotificationsContext } from '../../src/context/notifications-context';
import { StoryBar } from '../../src/components/StoryBar';
import { GlassPanel } from '../../src/ui/GlassPanel';

// ============================================================
// HELPERS
// ============================================================
function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Chào buổi khuya';
  if (h < 12) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes}p trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

// ============================================================
// TYPES
// ============================================================
interface Stats {
  friends: number;
  conversations: number;
  unread: number;
  posts: number;
}

interface TrendingPost {
  _id: string;
  title: string;
  author?: { displayName: string };
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

interface Activity {
  _id: string;
  type: 'friend_added' | 'post_liked' | 'comment' | 'mention' | 'system';
  message: string;
  createdAt: string;
  read: boolean;
}

// ============================================================
// COMPONENT: STAT CARD
// ============================================================
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  loading?: boolean;
}

function StatCard({ label, value, icon, color, loading }: StatCardProps) {
  return (
    <GlassPanel style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}18` }]}>
        {icon}
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={color} style={{ marginTop: 8 }} />
      ) : (
        <Text style={styles.statValue}>{value}</Text>
      )}
      <Text style={styles.statLabel}>{label}</Text>
    </GlassPanel>
  );
}

// ============================================================
// COMPONENT: QUICK ACTION
// ============================================================
interface QuickActionProps {
  label: string;
  icon: React.ReactNode;
  color: string;
  onPress: () => void;
}

function QuickAction({ label, icon, color, onPress }: QuickActionProps) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickIconWrap, { backgroundColor: `${color}18` }]}>
        {icon}
      </View>
      <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

// ============================================================
// COMPONENT: TRENDING POST ITEM
// ============================================================
interface TrendingPostItemProps {
  post: TrendingPost;
  index: number;
  onPress: (post: TrendingPost) => void;
  theme: ReturnType<typeof getAppTheme>;
}

function TrendingPostItem({ post, index, theme }: TrendingPostItemProps) {
  return (
    <TouchableOpacity style={styles.trendingItem} activeOpacity={0.7}>
      <View style={styles.trendingLeft}>
        <View style={[styles.trendingRank, { backgroundColor: `${theme.accent}20` }]}>
          <Text style={[styles.trendingRankText, { color: theme.accent }]}>
            {index + 1}
          </Text>
        </View>
      </View>
      <View style={styles.trendingContent}>
        <Text style={styles.trendingTitle} numberOfLines={2}>{post.title}</Text>
        <View style={styles.trendingMeta}>
          <Text style={styles.trendingMetaText}>{post.author?.displayName || 'Không rõ'}</Text>
          <View style={styles.trendingDot} />
          <Ionicons name="heart" size={12} color={theme.danger} />
          <Text style={styles.trendingMetaText}>{post.likesCount}</Text>
          <View style={styles.trendingDot} />
          <Ionicons name="chatbubble-ellipses" size={12} color={theme.info} />
          <Text style={styles.trendingMetaText}>{post.commentsCount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// COMPONENT: ACTIVITY ITEM
// ============================================================
interface ActivityItemProps {
  activity: Activity;
  theme: ReturnType<typeof getAppTheme>;
}

function ActivityItem({ activity, theme }: ActivityItemProps) {
  const getActivityIcon = () => {
    switch (activity.type) {
      case 'friend_added':
        return <Users size={16} color={theme.accent} />;
      case 'post_liked':
        return <Ionicons name="heart" size={16} color={theme.danger} />;
      case 'comment':
        return <Ionicons name="chatbubble-ellipses" size={16} color={theme.info} />;
      case 'mention':
        return <Ionicons name="at" size={16} color={theme.violet} />;
      default:
        return <Sparkles size={16} color={theme.warning} />;
    }
  };

  return (
    <View style={[styles.activityItem, !activity.read && styles.activityUnread]}>
      <View style={[styles.activityIcon, { backgroundColor: `${theme.accent}18` }]}>
        {getActivityIcon()}
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityMessage} numberOfLines={2}>{activity.message}</Text>
        <Text style={styles.activityTime}>{formatTimeAgo(activity.createdAt)}</Text>
      </View>
      {!activity.read && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
    </View>
  );
}

// ============================================================
// COMPONENT: EMPTY STATE
// ============================================================
interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function EmptyState({ icon, title, description }: EmptyStateProps) {
  return (
    <View style={styles.emptyState}>
      {icon}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{description}</Text>
    </View>
  );
}

// ============================================================
// MAIN SCREEN
// ============================================================
export default function HomeScreen() {
  const router = useRouter();
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);
  const userInfo = useAuthStore((s) => s.userInfo);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const {
    unreadCount: notificationUnread,
    openNotificationSheet,
    refreshUnreadCount,
  } = useNotificationsContext();
  const notificationBtnRef = useRef<View>(null);

  // State
  const [stats, setStats] = useState<Stats>({ friends: 0, conversations: 0, unread: 0, posts: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [trendingPosts, setTrendingPosts] = useState<TrendingPost[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(true);

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const displayName = userInfo?.displayName || userInfo?.username || 'User';
  const currentUserId = userInfo?._id || userInfo?.id || '';

  // ============================================================
  // DATA LOADING
  // ============================================================
  const loadStats = useCallback(async () => {
    try {
      setStatsError(null);
      const [friendsRes, convsRes, postsRes] = await Promise.allSettled([
        api.get('/friends/count'),
        api.get('/conversations'),
        api.get('/posts/feed?limit=1'),
      ]);

      let friends = 0;
      if (friendsRes.status === 'fulfilled') {
        friends = friendsRes.value.data?.count || 0;
      }

      let conversations = 0;
      let unread = 0;
      if (convsRes.status === 'fulfilled') {
        const convs = convsRes.value.data?.conversations || convsRes.value.data?.data || [];
        conversations = convs.length;
        unread = convs.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      }

      let posts = 0;
      if (postsRes.status === 'fulfilled') {
        posts = postsRes.value.data?.total || postsRes.value.data?.posts?.length || 0;
      }

      setStats({ friends, conversations, unread, posts });
    } catch (e) {
      console.error('Stats load error:', e);
      setStatsError('Không thể tải dữ liệu');
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadTrending = useCallback(async () => {
    try {
      const res = await api.get('/posts/trending?limit=5');
      const data = res.data?.data || res.data?.posts || [];
      setTrendingPosts(data);
    } catch (e) {
      console.error('Trending load error:', e);
    } finally {
      setTrendingLoading(false);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    try {
      const res = await api.get('/notifications?limit=10');
      const data = res.data?.notifications || res.data?.data || [];
      setActivities(data);
    } catch (e) {
      console.error('Activities load error:', e);
    } finally {
      setActivitiesLoading(false);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([loadStats(), loadTrending(), loadActivities()]);
  }, [loadStats, loadTrending, loadActivities]);

  // ============================================================
  // EFFECTS
  // ============================================================
  useEffect(() => {
    if (isAuthenticated && isHydrated) {
      void loadAllData();
    } else if (isHydrated && !isAuthenticated) {
      setStatsLoading(false);
      setTrendingLoading(false);
      setActivitiesLoading(false);
    }
  }, [isAuthenticated, isHydrated, loadAllData]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/(auth)/welcome');
    }
  }, [isHydrated, isAuthenticated, router]);

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  // ============================================================
  // HANDLERS
  // ============================================================
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setStatsLoading(true);
    setTrendingLoading(true);
    setActivitiesLoading(true);
    void loadAllData();
    setRefreshing(false);
  }, [loadAllData]);

  const onPressNotificationBell = useCallback(() => {
    const v = notificationBtnRef.current;
    if (!v) {
      openNotificationSheet(null);
      return;
    }
    v.measureInWindow((pageX, pageY, width, height) => {
      if (width <= 0 || height <= 0) {
        openNotificationSheet(null);
        return;
      }
      openNotificationSheet({ pageX, pageY, width, height });
    });
  }, [openNotificationSheet]);

  const handleCreateStory = useCallback(() => {
    router.push('/create-story');
  }, [router]);

  const handleViewStory = useCallback((feedIndex: number) => {
    router.push({ pathname: '/create-story', params: { feedIndex: String(feedIndex) } });
  }, [router]);

  const handleViewMyStory = useCallback(() => {
    router.push('/create-story');
  }, [router]);

  const handleTrendingPostPress = useCallback((post: TrendingPost) => {
    router.push({ pathname: '/post-detail', params: { postId: post._id } });
  }, [router]);

  const handleRetry = useCallback(() => {
    setStatsLoading(true);
    setStatsError(null);
    void loadStats();
  }, [loadStats]);

  // ============================================================
  // RENDER
  // ============================================================
  if (!isAuthenticated) {
    return (
      <LinearGradient
        colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
        style={styles.safeArea}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* ============================================================ */}
        {/* HEADER */}
        {/* ============================================================ */}
        <View style={styles.headerContainer}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerGreeting}>{getGreeting()},</Text>
            <Text style={styles.headerName} numberOfLines={1}>{displayName}</Text>
          </View>
          <TouchableOpacity
            ref={notificationBtnRef}
            style={styles.notificationBtn}
            onPress={onPressNotificationBell}
            activeOpacity={0.75}
            accessibilityLabel="Thông báo"
          >
            <Ionicons name="notifications-outline" size={24} color={theme.textPrimary} />
            {notificationUnread > 0 && (
              <View style={[styles.badge, { backgroundColor: theme.danger }]}>
                <Text style={styles.badgeText}>
                  {notificationUnread > 99 ? '99+' : String(notificationUnread)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
        >
          {/* ============================================================ */}
          {/* STORIES BAR */}
          {/* ============================================================ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Khoảnh khắc</Text>
            <StoryBar
              currentUserId={currentUserId}
              currentUserName={displayName}
              onCreateStory={handleCreateStory}
              onViewStory={handleViewStory}
              onViewMyStory={handleViewMyStory}
            />
          </View>

          {/* ============================================================ */}
          {/* STATS GRID */}
          {/* ============================================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Tổng quan</Text>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => router.push('/(tabs)/profile')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>Xem chi tiết</Text>
                <ChevronRight size={14} color={theme.accent} />
              </TouchableOpacity>
            </View>

            {statsError ? (
              <View style={styles.errorContainer}>
                <Ionicons name="cloud-offline-outline" size={40} color={theme.textSecondary} />
                <Text style={styles.errorText}>{statsError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRetry} activeOpacity={0.7}>
                  <Ionicons name="refresh-outline" size={16} color={colors.text} />
                  <Text style={styles.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.statsGrid}>
                <StatCard
                  label="Bạn bè"
                  value={stats.friends}
                  icon={<Users size={20} color={theme.accent} />}
                  color={theme.accent}
                  loading={statsLoading}
                />
                <StatCard
                  label="Hội thoại"
                  value={stats.conversations}
                  icon={<MessageCircle size={20} color={theme.info} />}
                  color={theme.info}
                  loading={statsLoading}
                />
                <StatCard
                  label="Tin nhắn mới"
                  value={stats.unread}
                  icon={<Mail size={20} color={theme.warning} />}
                  color={theme.warning}
                  loading={statsLoading}
                />
              </View>
            )}
          </View>

          {/* ============================================================ */}
          {/* QUICK ACTIONS */}
          {/* ============================================================ */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
            <View style={styles.quickGrid}>
              <QuickAction
                label="Tin nhắn"
                icon={<MessageCircle size={22} color={theme.accent} />}
                color={theme.accent}
                onPress={() => router.push('/(tabs)/chat')}
              />
              <QuickAction
                label="Danh bạ"
                icon={<Users size={22} color={theme.info} />}
                color={theme.info}
                onPress={() => router.push('/(tabs)/friends')}
              />
              <QuickAction
                label="Cộng đồng"
                icon={<Globe size={22} color={theme.violet} />}
                color={theme.violet}
                onPress={() => router.push('/(tabs)/community')}
              />
              <QuickAction
                label="Khám phá"
                icon={<Compass size={22} color={theme.warning} />}
                color={theme.warning}
                onPress={() => router.push('/explore')}
              />
              <QuickAction
                label="Tạo nhóm"
                icon={<AddCircle size={22} color={theme.pink} />}
                color={theme.pink}
                onPress={() => router.push('/create-group')}
              />
            </View>
          </View>

          {/* ============================================================ */}
          {/* TRENDING POSTS */}
          {/* ============================================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <TrendingUp size={18} color={theme.accent} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Xu hướng</Text>
              </View>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => router.push('/explore')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>Xem thêm</Text>
                <ChevronRight size={14} color={theme.accent} />
              </TouchableOpacity>
            </View>

            {trendingLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={styles.loadingText}>Đang tải bài viết...</Text>
              </View>
            ) : trendingPosts.length === 0 ? (
              <EmptyState
                icon={<Zap size={32} color={theme.textSecondary} />}
                title="Chưa có bài viết xu hướng"
                description="Hãy là người đầu tiên đăng bài!"
              />
            ) : (
              <GlassPanel style={styles.trendingPanel}>
                {trendingPosts.map((post, index) => (
                  <TrendingPostItem
                    key={post._id}
                    post={post}
                    index={index}
                    onPress={handleTrendingPostPress}
                    theme={theme}
                  />
                ))}
              </GlassPanel>
            )}
          </View>

          {/* ============================================================ */}
          {/* RECENT ACTIVITY */}
          {/* ============================================================ */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Calendar size={18} color={theme.accent} />
                <Text style={[styles.sectionTitle, { marginLeft: 8 }]}>Hoạt động gần đây</Text>
              </View>
              <TouchableOpacity
                style={styles.seeAllBtn}
                onPress={() => router.push('/notifications')}
                activeOpacity={0.7}
              >
                <Text style={styles.seeAllText}>Xem tất cả</Text>
                <ChevronRight size={14} color={theme.accent} />
              </TouchableOpacity>
            </View>

            {activitiesLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={theme.accent} />
                <Text style={styles.loadingText}>Đang tải hoạt động...</Text>
              </View>
            ) : activities.length === 0 ? (
              <EmptyState
                icon={<Sparkles size={32} color={theme.textSecondary} />}
                title="Chưa có hoạt động"
                description="Các thông báo sẽ xuất hiện ở đây"
              />
            ) : (
              <GlassPanel style={styles.activityPanel}>
                {activities.slice(0, 5).map((activity) => (
                  <ActivityItem key={activity._id} activity={activity} theme={theme} />
                ))}
              </GlassPanel>
            )}
          </View>

          {/* ============================================================ */}
          {/* ABOUT CARD */}
          {/* ============================================================ */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.aboutCard}
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.aboutIcon, { backgroundColor: `${theme.accent}18` }]}>
                <Sparkles size={20} color={theme.accent} />
              </View>
              <View style={styles.aboutContent}>
                <Text style={styles.aboutTitle}>Zync Platform</Text>
                <Text style={styles.aboutDesc}>
                  Nhắn tin thời gian thực, kết nối mọi lúc mọi nơi
                </Text>
              </View>
              <ChevronRight size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: 'transparent' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16 },

  // Header
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  headerLeft: { flex: 1, marginRight: 12 },
  headerGreeting: {
    ...typography.caption,
    color: colors.textSubtle,
    fontSize: 13,
  },
  headerName: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text,
    marginTop: 2,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.backgroundDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.text,
    fontSize: 9,
    fontFamily: 'BeVietnamPro_700Bold',
  },

  // Section
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    ...typography.h2,
    fontSize: 17,
    color: colors.text,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.accent,
  },

  // Stats
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    ...typography.h2,
    fontSize: 20,
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 4,
    textAlign: 'center',
  },

  // Quick Actions
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    alignItems: 'center',
    width: '18%',
  },
  quickIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSubtle,
    textAlign: 'center',
  },

  // Trending
  trendingPanel: { padding: 0, overflow: 'hidden' },
  trendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  trendingLeft: { marginRight: 12 },
  trendingRank: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingRankText: {
    ...typography.h2,
    fontSize: 14,
  },
  trendingContent: { flex: 1 },
  trendingTitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  trendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  trendingDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textSubtle,
    marginHorizontal: 4,
  },
  trendingMetaText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSubtle,
  },

  // Activity
  activityPanel: { padding: 0, overflow: 'hidden' },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorderSoft,
  },
  activityUnread: {
    backgroundColor: colors.glassUltra,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: { flex: 1 },
  activityMessage: {
    ...typography.body,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
  },
  activityTime: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSubtle,
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  emptyTitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  emptyDesc: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSubtle,
    textAlign: 'center',
  },

  // Loading & Error
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  loadingText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSubtle,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  errorText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.textSubtle,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    marginTop: 4,
  },
  retryText: {
    ...typography.caption,
    fontSize: 13,
    color: colors.text,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },

  // About Card
  aboutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassPanel,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  aboutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aboutContent: { flex: 1 },
  aboutTitle: {
    ...typography.body,
    fontSize: 15,
    color: colors.text,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  aboutDesc: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSubtle,
    marginTop: 2,
  },

  bottomSpacer: { height: 100 },
});
