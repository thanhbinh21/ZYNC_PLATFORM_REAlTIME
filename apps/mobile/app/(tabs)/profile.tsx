import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/useAuthStore';
import { socketService } from '../../src/services/socket';
import api from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const userInfo = useAuthStore((s) => s.userInfo);
  const logout = useAuthStore((s) => s.logout);

  const [friendCount, setFriendCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);

  const displayName = userInfo?.displayName || 'Zync User';
  const email = userInfo?.email || 'user@zync.platform';
  const username = userInfo?.username ? `@${userInfo.username}` : null;
  const joinedYear = userInfo?.createdAt ? new Date(userInfo.createdAt).getFullYear() : new Date().getFullYear();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [friendsRes, convsRes] = await Promise.all([
          api.get('/friends/count').catch(() => ({ data: { count: 0 } })),
          api.get('/conversations').catch(() => ({ data: { conversations: [] } })),
        ]);
        setFriendCount(friendsRes.data?.count || 0);
        setConversationCount(convsRes.data?.conversations?.length || 0);
      } catch (e) {
        console.error('Profile stats error:', e);
      }
    };
    loadStats();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Đăng xuất',
      'Bạn có chắc chắn muốn đăng xuất?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Đăng xuất',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call server logout endpoint
              await api.post('/auth/logout').catch(() => {});
              // Disconnect socket
              socketService.disconnect();
              // Clear local state
              await logout();
              // Navigate to login
              router.replace('/(auth)/login');
            } catch (e) {
              console.error('Logout error:', e);
              await logout();
              router.replace('/(auth)/login');
            }
          },
        },
      ]
    );
  };

  const menuOptions = [
    { title: 'Tài khoản và Bảo mật', icon: 'shield-checkmark-outline', color: '#10b981' },
    { title: 'Quyền riêng tư', icon: 'lock-closed-outline', color: '#3b82f6' },
    { title: 'Thông báo', icon: 'notifications-outline', color: '#f59e0b' },
    { title: 'Giao diện và Ngôn ngữ', icon: 'color-palette-outline', color: '#8b5cf6' },
    { title: 'Trợ giúp & Phản hồi', icon: 'help-circle-outline', color: '#ec4899' },
  ];

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          {username ? <Text style={styles.userHandle}>{username}</Text> : null}
          <Text style={styles.userEmail}>{email}</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.editProfileBtn}>
              <Text style={styles.editProfileText}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
              <Ionicons name="settings-outline" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{friendCount}</Text>
            <Text style={styles.statLabel}>Bạn bè</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{conversationCount}</Text>
            <Text style={styles.statLabel}>Hội thoại</Text>
          </View>
          <View style={styles.dividerVertical} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{joinedYear}</Text>
            <Text style={styles.statLabel}>Tham gia</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuOptions.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem}>
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={22} color={item.color} />
              </View>
              <Text style={styles.menuText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color="#475569" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

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
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'transparent',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 35,
    backgroundColor: '#334155',
    borderWidth: 3,
    borderColor: '#10b981',
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#10b981',
    fontSize: 36,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  userName: {
    color: '#fff',
    fontSize: 22,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  userHandle: {
    color: '#86efac',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
    marginTop: 4,
  },
  userEmail: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 5,
  },
  headerActions: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  editProfileBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  editProfileText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  settingsBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.glassPanel,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 25,
    marginHorizontal: 20,
    marginTop: -25,
    backgroundColor: colors.glassPanel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    shadowColor: colors.glassShadow,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    height: '60%',
    alignSelf: 'center',
  },
  menuContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.glassBorderSoft,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_500Medium',
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 30,
    paddingVertical: 15,
    backgroundColor: 'rgba(127, 29, 29, 0.32)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.36)',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
});
