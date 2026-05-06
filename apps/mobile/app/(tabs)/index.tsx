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
import { colors } from '../../src/theme/colors';
import { useAppPreferencesStore } from '../../src/store/useAppPreferencesStore';
import { getAppTheme } from '../../src/theme/get-app-theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import api from '../../src/services/api';
import { useNotificationsContext } from '../../src/context/notifications-context';

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
      marginBottom: 25,
    },
    welcomeText: {
      color: theme.textTertiary,
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
      backgroundColor: theme.glassPanel ?? colors.glassPanel,
      borderWidth: 1,
      borderColor: theme.glassBorder ?? colors.glassBorder,
      shadowColor: theme.glassShadow ?? colors.glassShadow,
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
    section: { marginBottom: 25 },
    sectionTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontFamily: 'BeVietnamPro_600SemiBold',
      marginBottom: 15,
    },
    storyContainer: { flexDirection: 'row' },
    addStory: { alignItems: 'center', marginRight: 15 },
    addStoryCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.glassSoft ?? colors.glassSoft,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: theme.accentLight,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    storyItem: { alignItems: 'center', marginRight: 15 },
    storyCircle: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.glassPanelStrong ?? colors.glassPanelStrong,
      borderWidth: 2,
      borderColor: theme.accent,
      marginBottom: 8,
    },
    storyLabel: {
      color: theme.textTertiary,
      fontSize: 12,
      fontFamily: 'BeVietnamPro_400Regular',
      width: 60,
      textAlign: 'center',
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 25,
    },
    statCard: {
      width: '30%',
      backgroundColor: theme.glassPanel ?? colors.glassPanel,
      borderRadius: 16,
      padding: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.glassBorder ?? colors.glassBorder,
      shadowColor: theme.glassShadow ?? colors.glassShadow,
      shadowOpacity: 0.3,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 8 },
    },
    statValue: {
      color: theme.textPrimary,
      fontSize: 18,
      fontFamily: 'BeVietnamPro_700Bold',
      marginTop: 8,
    },
    statLabel: {
      color: theme.textTertiary,
      fontSize: 12,
      fontFamily: 'BeVietnamPro_400Regular',
      marginTop: 4,
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 12,
    },
    quickAction: { width: '18%', alignItems: 'center' },
    quickIcon: {
      width: 50,
      height: 50,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    quickLabel: {
      color: theme.textTertiary,
      fontSize: 11,
      fontFamily: 'BeVietnamPro_500Medium',
      textAlign: 'center',
    },
    aboutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.glassPanel ?? colors.glassPanel,
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.glassBorder ?? colors.glassBorder,
      shadowColor: theme.glassShadow ?? colors.glassShadow,
      shadowOpacity: 0.26,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
    },
    aboutIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.glassSoft ?? colors.glassSoft,
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
      color: theme.textTertiary,
      fontFamily: 'BeVietnamPro_400Regular',
      marginTop: 2,
    },
  });

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

  const [friendCount, setFriendCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const displayName = userInfo?.displayName || 'Zync User';

  const loadStats = useCallback(async () => {
    try {
      const friendsRes = await api.get('/friends/count').catch(() => ({ data: { count: 0 } }));
      setFriendCount(friendsRes.data?.count || 0);

      const convsRes = await api.get('/conversations').catch(() => ({ data: { conversations: [] } }));
      const convs = convsRes.data?.conversations || [];
      setConversationCount(convs.length);
      const totalUnread = convs.reduce((sum: number, c: any) => sum + (c.unreadCount || 0), 0);
      setUnreadTotal(totalUnread);
    } catch (e) {
      console.error('Stats load error:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadStats();
    } else if (isHydrated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isHydrated]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isHydrated, isAuthenticated, router]);

  const stats = [
    { label: 'Bạn bè', value: friendCount.toLocaleString(), icon: 'people-outline', color: theme.accent },
    { label: 'Hội thoại', value: conversationCount.toLocaleString(), icon: 'chatbubbles-outline', color: theme.info },
    { label: 'Chưa đọc', value: unreadTotal.toLocaleString(), icon: 'mail-unread-outline', color: theme.warning },
  ];

  const quickActions = [
    { label: 'Tin nhắn', icon: 'chatbubble-ellipses', color: theme.accent, action: () => router.push('/(tabs)/chat') },
    { label: 'Danh bạ', icon: 'people', color: theme.info, action: () => router.push('/(tabs)/friends') },
    { label: 'Cộng đồng', icon: 'globe', color: theme.violet, action: () => router.push('/(tabs)/community') },
    { label: 'Khám phá', icon: 'compass', color: theme.warning, action: () => router.push('/explore') },
    { label: 'Tạo nhóm', icon: 'add-circle', color: theme.pink, action: () => router.push('/create-group') },
  ];

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

          {/* Story Bar Placeholder */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Khoảnh khắc</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.storyContainer}>
              <TouchableOpacity style={s.addStory} onPress={() => router.push('/create-story')}>
                <View style={s.addStoryCircle}>
                  <Ionicons name="add" size={24} color={theme.accent} />
                </View>
                <Text style={s.storyLabel}>Thêm tin</Text>
              </TouchableOpacity>
              {[1, 2, 3, 4, 5].map((i) => (
                <View key={i} style={s.storyItem}>
                  <View style={s.storyCircle} />
                  <Text style={s.storyLabel} numberOfLines={1}>User {i}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Stats Grid */}
          <View style={s.statsGrid}>
            {stats.map((item, idx) => (
              <TouchableOpacity key={idx} style={s.statCard}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
                {isLoading ? (
                  <ActivityIndicator size="small" color={item.color} style={{ marginTop: 8 }} />
                ) : (
                  <Text style={s.statValue}>{item.value}</Text>
                )}
                <Text style={s.statLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Thao tác nhanh</Text>
            <View style={s.quickGrid}>
              {quickActions.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={s.quickAction}
                  onPress={item.action}
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
            <View style={s.aboutCard}>
              <View style={s.aboutIcon}>
                <Ionicons name="sparkles" size={20} color={theme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.aboutTitle}>Zync Platform</Text>
                <Text style={s.aboutDesc}>Nhắn tin thời gian thực, kết nối mọi lúc mọi nơi</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
