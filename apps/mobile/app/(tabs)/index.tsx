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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme/colors';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';
import { getAppTheme } from '../../src/theme/get-app-theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import api from '../../src/services/api';
import { useNotificationsContext } from '../../src/context/notifications-context';
import { StoryBar } from '../../src/components/StoryBar';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'Chào buổi khuya';
  if (h < 12) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}

const useStyles = (theme: ReturnType<typeof getAppTheme>) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: 'transparent' },
    container: { flex: 1, padding: 20 },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    welcomeText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontFamily: 'BeVietnamPro_400Regular',
    },
    userName: {
      color: theme.textPrimary,
      fontSize: 22,
      fontFamily: 'BeVietnamPro_700Bold',
    },
    notificationBtn: {
      width: 45,
      height: 45,
      borderRadius: 12,
      backgroundColor: theme.glassPanel,
      borderWidth: 1,
      borderColor: theme.glassBorder,
      shadowColor: theme.glassShadow,
      shadowOpacity: 0.35,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      overflow: 'visible',
    },
    notificationBtnHit: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 2,
      minWidth: 18,
      height: 18,
      paddingHorizontal: 4,
      borderRadius: 9,
      backgroundColor: theme.danger,
      borderWidth: 2,
      borderColor: theme.bgCard,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      color: theme.textOnAccent,
      fontSize: 9,
      fontFamily: 'BeVietnamPro_700Bold',
    },
    section: { marginBottom: 24 },
    sectionTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontFamily: 'BeVietnamPro_600SemiBold',
      marginBottom: 12,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.glassPanel,
      borderRadius: 16,
      padding: 16,
      alignItems: 'center',
      marginHorizontal: 4,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
    statValue: {
      color: theme.textPrimary,
      fontSize: 20,
      fontFamily: 'BeVietnamPro_700Bold',
      marginTop: 8,
    },
    statLabel: {
      color: theme.textSecondary,
      fontSize: 12,
      fontFamily: 'BeVietnamPro_400Regular',
      marginTop: 4,
      textAlign: 'center',
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    quickAction: { width: '18%', alignItems: 'center' },
    quickIcon: {
      width: 52,
      height: 52,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    quickLabel: {
      color: theme.textSecondary,
      fontSize: 11,
      fontFamily: 'BeVietnamPro_500Medium',
      textAlign: 'center',
    },
    aboutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.glassPanel,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.glassBorder,
    },
    aboutIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.glassSoft,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    aboutTitle: {
      fontSize: 15,
      color: theme.textPrimary,
      fontFamily: 'BeVietnamPro_600SemiBold',
    },
    aboutDesc: {
      fontSize: 12,
      color: theme.textSecondary,
      fontFamily: 'BeVietnamPro_400Regular',
      marginTop: 2,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    errorText: {
      color: theme.textSecondary,
      fontSize: 14,
      fontFamily: 'BeVietnamPro_400Regular',
      textAlign: 'center',
      marginTop: 12,
      marginBottom: 16,
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.accent,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 12,
      gap: 8,
    },
    retryText: {
      color: theme.textOnAccent,
      fontSize: 14,
      fontFamily: 'BeVietnamPro_600SemiBold',
    },
    bottomSpacer: { height: 100 },
  });

interface Stats {
  friends: number;
  conversations: number;
  unread: number;
}

export default function HomeScreen() {
  const router = useRouter();
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);
  const s = useStyles(theme);
  const userInfo = useAuthStore((s) => s.userInfo);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const { unreadCount: notificationUnread, openNotificationSheet, refreshUnreadCount } =
    useNotificationsContext();
  const notificationBtnRef = useRef<View>(null);

  const [stats, setStats] = useState<Stats>({ friends: 0, conversations: 0, unread: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const displayName = userInfo?.displayName || userInfo?.username || 'User';
  const currentUserId = userInfo?._id || userInfo?.id || '';

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

  useFocusEffect(
    useCallback(() => {
      void refreshUnreadCount();
    }, [refreshUnreadCount]),
  );

  const loadStats = useCallback(async () => {
    try {
      setStatsError(null);
      
      const [friendsRes, convsRes] = await Promise.allSettled([
        api.get('/friends/count'),
        api.get('/conversations'),
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

      setStats({ friends, conversations, unread });
    } catch (e) {
      console.error('Stats load error:', e);
      setStatsError('Không thể tải dữ liệu');
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && isHydrated) {
      void loadStats();
    } else if (isHydrated && !isAuthenticated) {
      setStatsLoading(false);
    }
  }, [isAuthenticated, isHydrated, loadStats]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/(auth)/welcome');
    }
  }, [isHydrated, isAuthenticated, router]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadStats();
  }, [loadStats]);

  const handleCreateStory = useCallback(() => {
    router.push('/create-story');
  }, [router]);

  const handleViewStory = useCallback((feedIndex: number) => {
    router.push({ pathname: '/create-story', params: { feedIndex: String(feedIndex) } });
  }, [router]);

  const handleViewMyStory = useCallback(() => {
    router.push('/create-story');
  }, [router]);

  const handleRetry = () => {
    setStatsLoading(true);
    void loadStats();
  };

  const quickActions = [
    { label: 'Tin nhắn', icon: 'chatbubble-ellipses', color: theme.accent, route: '/(tabs)/chat' },
    { label: 'Danh bạ', icon: 'people', color: theme.info, route: '/(tabs)/friends' },
    { label: 'Cộng đồng', icon: 'globe', color: theme.violet, route: '/(tabs)/community' },
    { label: 'Khám phá', icon: 'compass', color: theme.warning, route: '/explore' },
    { label: 'Tạo nhóm', icon: 'add-circle', color: theme.pink, route: '/create-group' },
  ];

  if (!isAuthenticated) {
    return (
      <LinearGradient
        colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
        style={s.safeArea}
      >
        <SafeAreaView style={s.safeArea}>
          <View style={s.loadingContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={s.safeArea}
    >
      <SafeAreaView style={s.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ScrollView
          style={s.container}
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
          {/* Header */}
          <View style={s.header}>
            <View>
              <Text style={s.welcomeText}>{getGreeting()},</Text>
              <Text style={s.userName}>{displayName}</Text>
            </View>
            <View ref={notificationBtnRef} collapsable={false} style={s.notificationBtn}>
              <TouchableOpacity
                onPress={onPressNotificationBell}
                accessibilityLabel="Thông báo"
                activeOpacity={0.75}
                style={s.notificationBtnHit}
              >
                <Ionicons name="notifications-outline" size={24} color={theme.textPrimary} />
                {notificationUnread > 0 && (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>
                      {notificationUnread > 99 ? '99+' : String(notificationUnread)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Stories Bar - Fetched from API */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Khoảnh khắc</Text>
            <StoryBar
              currentUserId={currentUserId}
              currentUserName={displayName}
              onCreateStory={handleCreateStory}
              onViewStory={handleViewStory}
              onViewMyStory={handleViewMyStory}
            />
          </View>

          {/* Stats Grid */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Thống kê</Text>
            {statsError ? (
              <View style={s.errorContainer}>
                <Ionicons name="cloud-offline-outline" size={48} color={theme.textSecondary} />
                <Text style={s.errorText}>{statsError}</Text>
                <TouchableOpacity style={s.retryButton} onPress={handleRetry}>
                  <Ionicons name="refresh-outline" size={18} color={theme.textOnAccent} />
                  <Text style={s.retryText}>Thử lại</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.statsGrid}>
                <View style={s.statCard}>
                  {statsLoading ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : (
                    <Ionicons name="people-outline" size={24} color={theme.accent} />
                  )}
                  {statsLoading ? (
                    <ActivityIndicator size="small" color={theme.accent} style={{ marginTop: 8 }} />
                  ) : (
                    <Text style={s.statValue}>{stats.friends}</Text>
                  )}
                  <Text style={s.statLabel}>Bạn bè</Text>
                </View>

                <View style={s.statCard}>
                  {statsLoading ? (
                    <ActivityIndicator size="small" color={theme.info} />
                  ) : (
                    <Ionicons name="chatbubbles-outline" size={24} color={theme.info} />
                  )}
                  {statsLoading ? (
                    <ActivityIndicator size="small" color={theme.info} style={{ marginTop: 8 }} />
                  ) : (
                    <Text style={s.statValue}>{stats.conversations}</Text>
                  )}
                  <Text style={s.statLabel}>Hội thoại</Text>
                </View>

                <View style={s.statCard}>
                  {statsLoading ? (
                    <ActivityIndicator size="small" color={theme.warning} />
                  ) : (
                    <Ionicons name="mail-unread-outline" size={24} color={theme.warning} />
                  )}
                  {statsLoading ? (
                    <ActivityIndicator size="small" color={theme.warning} style={{ marginTop: 8 }} />
                  ) : (
                    <Text style={s.statValue}>{stats.unread}</Text>
                  )}
                  <Text style={s.statLabel}>Chưa đọc</Text>
                </View>
              </View>
            )}
          </View>

          {/* Quick Actions */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Thao tác nhanh</Text>
            <View style={s.quickGrid}>
              {quickActions.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.quickAction}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[s.quickIcon, { backgroundColor: `${item.color}15` }]}>
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <Text style={s.quickLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* About Zync */}
          <View style={s.section}>
            <TouchableOpacity 
              style={s.aboutCard} 
              onPress={() => router.push('/(tabs)/profile')}
              activeOpacity={0.7}
            >
              <View style={s.aboutIcon}>
                <Ionicons name="sparkles" size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.aboutTitle}>Zync Platform</Text>
                <Text style={s.aboutDesc}>Nhắn tin thời gian thực, kết nối mọi lúc mọi nơi</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={s.bottomSpacer} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
