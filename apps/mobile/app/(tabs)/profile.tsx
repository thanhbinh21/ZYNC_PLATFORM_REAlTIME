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
import {
  Bell,
  ChevronRight,
  HelpCircle,
  Lock,
  LogOut,
  Palette,
  Settings,
  ShieldCheck,
} from 'lucide-react-native';
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
    { title: 'Tài khoản và Bảo mật', Icon: ShieldCheck, color: colors.success },
    { title: 'Quyền riêng tư', Icon: Lock, color: colors.info },
    { title: 'Thông báo', Icon: Bell, color: colors.warning },
    { title: 'Giao diện và Ngôn ngữ', Icon: Palette, color: colors.violet },
    { title: 'Trợ giúp & Phản hồi', Icon: HelpCircle, color: colors.pink },
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
              <Settings size={20} stroke={colors.text} />
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
                <item.Icon size={22} stroke={item.color} />
              </View>
              <Text style={styles.menuText}>{item.title}</Text>
              <ChevronRight size={18} stroke={colors.textSubtle} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={22} stroke={colors.error} style={{ marginRight: 10 }} />
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
    backgroundColor: colors.glassStrong,
    borderWidth: 3,
    borderColor: colors.success,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.success,
    fontSize: 36,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  userName: {
    color: colors.text,
    fontSize: 22,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  userHandle: {
    color: colors.accentSoft,
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
    marginTop: 4,
  },
  userEmail: {
    color: colors.textMuted,
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
    backgroundColor: colors.success,
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
  },
  editProfileText: {
    color: colors.text,
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
    color: colors.text,
    fontSize: 18,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: colors.divider,
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
    color: colors.text,
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
    backgroundColor: colors.dangerSoft,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
});
