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

export default function HomeScreen() {
  const router = useRouter();
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
      // Load friend count
      const friendsRes = await api.get('/friends/count').catch(() => ({ data: { count: 0 } }));
      setFriendCount(friendsRes.data?.count || 0);

      // Load conversations for unread + count
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
      loadStats();
    } else if (isHydrated) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isHydrated, loadStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStats();
  }, [loadStats]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isHydrated && !isAuthenticated) {
      router.replace('/(auth)/login');
    }
  }, [isHydrated, isAuthenticated]);

  const stats = [
    { label: 'Bạn bè', value: friendCount.toLocaleString(), icon: 'people-outline', color: '#10b981' },
    { label: 'Hội thoại', value: conversationCount.toLocaleString(), icon: 'chatbubbles-outline', color: '#3b82f6' },
    { label: 'Chưa đọc', value: unreadTotal.toLocaleString(), icon: 'mail-unread-outline', color: '#f59e0b' },
  ];

  const quickActions = [
    { label: 'Tin nhắn', icon: 'chatbubble-ellipses', color: '#10b981', tab: 'chat' },
    { label: 'Danh bạ', icon: 'people', color: '#3b82f6', tab: 'friends' },
    { label: 'Tìm kiếm', icon: 'search', color: '#8b5cf6', tab: 'friends' },
    { label: 'Tạo nhóm', icon: 'add-circle', color: '#ec4899', tab: 'chat' },
  ];

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#10b981"
              colors={['#10b981']}
            />
          }
        >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>{getGreeting()},</Text>
            <Text style={styles.userName}>{displayName} 👋</Text>
          </View>
          <View ref={notificationBtnRef} collapsable={false} style={styles.notificationBtn}>
            <TouchableOpacity
              onPress={onPressNotificationBell}
              accessibilityLabel="Thông báo"
              activeOpacity={0.75}
              style={styles.notificationBtnHit}
            >
              <Ionicons name="notifications-outline" size={24} color="#fff" />
              {notificationUnread > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {notificationUnread > 99 ? '99+' : String(notificationUnread)}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Story Bar Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Khoảnh khắc</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storyContainer}>
            <TouchableOpacity style={styles.addStory}>
              <View style={styles.addStoryCircle}>
                <Ionicons name="add" size={24} color="#10b981" />
              </View>
              <Text style={styles.storyLabel}>Thêm tin</Text>
            </TouchableOpacity>
            {[1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={styles.storyItem}>
                <View style={styles.storyCircle} />
                <Text style={styles.storyLabel} numberOfLines={1}>User {i}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.statCard}>
              <Ionicons name={item.icon as any} size={24} color={item.color} />
              {isLoading ? (
                <ActivityIndicator size="small" color={item.color} style={{ marginTop: 8 }} />
              ) : (
                <Text style={styles.statValue}>{item.value}</Text>
              )}
              <Text style={styles.statLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thao tác nhanh</Text>
          <View style={styles.quickGrid}>
            {quickActions.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickAction}
                onPress={() => {
                  if (item.tab === 'chat') router.push('/(tabs)/chat');
                  else router.push('/(tabs)/friends');
                }}
              >
                <View style={[styles.quickIcon, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon as any} size={24} color={item.color} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* About Zync */}
        <View style={styles.section}>
          <View style={styles.aboutCard}>
            <View style={styles.aboutIcon}>
              <Ionicons name="sparkles" size={20} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutTitle}>Zync Platform</Text>
              <Text style={styles.aboutDesc}>Nhắn tin thời gian thực, kết nối mọi lúc mọi nơi</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#475569" />
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
   </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  welcomeText: {
    color: '#94a3b8',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  notificationBtn: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: colors.glassPanel,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.glassShadow,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 5,
    },
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
    backgroundColor: '#ef4444',
    borderWidth: 2,
    borderColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginBottom: 15,
  },
  storyContainer: {
    flexDirection: 'row',
  },
  addStory: {
    alignItems: 'center',
    marginRight: 15,
  },
  addStoryCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#88f9d0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 15,
  },
  storyCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#334155',
    borderWidth: 2,
    borderColor: '#10b981',
    marginBottom: 8,
  },
  storyLabel: {
    color: '#94a3b8',
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
    backgroundColor: colors.glassPanel,
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.glassShadow,
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 4,
  },
  // ─ Quick Actions ─
  quickGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickAction: {
    width: '22%',
    alignItems: 'center',
  },
  quickIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_500Medium',
    textAlign: 'center',
  },
  // ─ About Card ─
  aboutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.glassPanel,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.glassShadow,
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 6,
    },
  },
  aboutIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.glassSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aboutTitle: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  aboutDesc: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
});
