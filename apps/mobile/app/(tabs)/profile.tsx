import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlertTriangle, Bell, ChevronRight, HelpCircle, History,
  KeyRound, Lock, LogOut, Palette, Shield, Settings, ShieldCheck,
} from 'lucide-react-native';
import { useAuthStore } from '../../src/store/useAuthStore';
import { socketService } from '../../src/services/socket';
import api from '../../src/services/api';

import { AppScreen } from '../../src/ui/AppScreen';
import { AppCard } from '../../src/ui/AppCard';
import { Avatar } from '../../src/ui/Avatar';
import { fonts } from '../../src/theme/fonts';
import { lightTheme } from '../../src/theme/colors';

export default function ProfileScreen() {
  const router = useRouter();
  const userInfo = useAuthStore((s) => s.userInfo);
  const logout = useAuthStore((s) => s.logout);

  const [friendCount, setFriendCount] = useState(0);
  const [conversationCount, setConversationCount] = useState(0);
  const [trustScore, setTrustScore] = useState(100);
  const [violationCount, setViolationCount] = useState(0);

  const displayName = userInfo?.displayName || 'Zync User';
  const email = userInfo?.email || 'user@zync.platform';
  const username = userInfo?.username ? `@${userInfo.username}` : null;
  const joinedYear = userInfo?.createdAt ? new Date(userInfo.createdAt).getFullYear() : new Date().getFullYear();

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [friendsRes, convsRes, meRes] = await Promise.all([
          api.get('/friends/count').catch(() => ({ data: { count: 0 } })),
          api.get('/conversations').catch(() => ({ data: { conversations: [] } })),
          api.get('/users/me').catch(() => ({ data: { user: null } })),
        ]);
        setFriendCount(friendsRes.data?.count || 0);
        setConversationCount(convsRes.data?.conversations?.length || 0);
        const meUser = meRes.data?.user as { trustScore?: number; globalViolationCount?: number } | undefined;
        setTrustScore(Math.max(0, Math.min(100, meUser?.trustScore ?? userInfo?.trustScore ?? 100)));
        setViolationCount(Math.max(0, meUser?.globalViolationCount ?? userInfo?.globalViolationCount ?? 0));
      } catch (e) {
        console.error('Profile stats error:', e);
      }
    };
    loadStats();
  }, []);

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/auth/logout').catch(() => {});
            socketService.disconnect();
            await logout();
            router.replace('/(auth)/login');
          } catch (e) {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  };

  const menuOptions = [
    { title: 'Tài khoản và Bảo mật', Icon: ShieldCheck, color: '#10B981', route: '/settings' },
    { title: 'Quyền riêng tư', Icon: Lock, color: '#2563EB', route: '/settings' },
    { title: 'Thông báo', Icon: Bell, color: '#F59E0B', route: '/settings' },
    { title: 'Giao diện và Ngôn ngữ', Icon: Palette, color: '#8B5CF6', route: '/settings' },
    { title: 'Trợ giúp & Phản hồi', Icon: HelpCircle, color: '#EC4899', route: '/settings' },
  ];
  const trustColor = trustScore >= 70 ? '#10B981' : trustScore >= 40 ? '#F59E0B' : '#EF4444';

  return (
    <AppScreen scrollable hideStatusBar={false}>
      {/* Header Info */}
      <View style={styles.profileHeader}>
        <Avatar 
          url={userInfo?.avatarUrl} 
          name={displayName} 
          size={100} 
          style={styles.avatarMargin}
          showStatus
          status="online"
        />
        <Text style={styles.userName}>{displayName}</Text>
        {username ? <Text style={styles.userHandle}>{username}</Text> : null}
        <Text style={styles.userEmail}>{email}</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.editProfileBtn} onPress={() => router.push('/settings')}>
            <Text style={styles.editProfileText}>Chỉnh sửa hồ sơ</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/settings')}>
            <Settings size={20} stroke={lightTheme.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.contentPadding}>
        {/* Stats Row */}
        <AppCard style={styles.statsCard}>
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
        </AppCard>

        {/* Menu Items */}
        <AppCard style={styles.menuCard}>
          {menuOptions.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.menuItem, index < menuOptions.length - 1 && styles.menuItemBorder]} 
              onPress={() => item.route && router.push(item.route as any)}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <item.Icon size={22} stroke={item.color} />
              </View>
              <Text style={styles.menuText}>{item.title}</Text>
              <ChevronRight size={18} stroke="#64748B" />
            </TouchableOpacity>
          ))}
        </AppCard>

        {/* Reputation & Security */}
        <AppCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Danh tiếng</Text>
          <View style={styles.trustRow}>
            <Text style={styles.trustLabel}>Điểm tin cậy</Text>
            <Text style={[styles.trustValue, { color: trustColor }]}>{trustScore}%</Text>
          </View>
          <View style={styles.trustBarTrack}>
            <View style={[styles.trustBarFill, { width: `${trustScore}%`, backgroundColor: trustColor }]} />
          </View>
          <View style={styles.violationRow}>
            <Text style={styles.violationLabel}>Lần vi phạm toàn hệ thống</Text>
            <Text style={[styles.violationValue, { color: violationCount >= 3 ? '#EF4444' : violationCount > 0 ? '#F59E0B' : '#10B981' }]}>
              {violationCount}
            </Text>
          </View>
          {violationCount >= 3 && (
            <View style={styles.warningBox}>
              <AlertTriangle size={16} stroke="#EF4444" />
              <Text style={styles.warningText}>Tài khoản có nguy cơ bị hạn chế nếu tiếp tục vi phạm.</Text>
            </View>
          )}
        </AppCard>

        <AppCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Bảo mật</Text>
          <View style={styles.securityItem}>
            <Shield size={18} stroke="#10B981" />
            <Text style={styles.securityText}>Xác thực hai bước: Đã bật</Text>
          </View>
          <View style={styles.securityItem}>
            <KeyRound size={18} stroke="#2563EB" />
            <Text style={styles.securityText}>Đổi mật khẩu định kỳ mỗi 90 ngày</Text>
          </View>
          <View style={styles.securityItem}>
            <History size={18} stroke="#F59E0B" />
            <Text style={styles.securityText}>Lịch sử đăng nhập: 1 thiết bị hoạt động</Text>
          </View>
        </AppCard>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <LogOut size={22} stroke="#EF4444" style={{ marginRight: 10 }} />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  avatarMargin: {
    marginBottom: 16,
  },
  userName: {
    color: lightTheme.textPrimary,
    fontSize: 22,
    fontFamily: fonts.bold,
  },
  userHandle: {
    color: lightTheme.accent,
    fontSize: 14,
    fontFamily: fonts.medium,
    marginTop: 4,
  },
  userEmail: {
    color: lightTheme.textTertiary,
    fontSize: 14,
    fontFamily: fonts.regular,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  editProfileBtn: {
    backgroundColor: lightTheme.accent,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  editProfileText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fonts.semiBold,
  },
  settingsBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8ECEF',
  },
  contentPadding: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 16,
  },
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: lightTheme.textPrimary,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: fonts.medium,
    color: lightTheme.textTertiary,
    marginTop: 4,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: '#E8ECEF',
    marginVertical: 4,
  },
  menuCard: {
    padding: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F8',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuText: {
    flex: 1,
    fontSize: 15,
    fontFamily: fonts.semiBold,
    color: lightTheme.textSecondary,
  },
  sectionCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.bold,
    color: lightTheme.textPrimary,
    marginBottom: 16,
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trustLabel: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: lightTheme.textSecondary,
  },
  trustValue: {
    fontSize: 16,
    fontFamily: fonts.bold,
  },
  trustBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F0F4F8',
    marginBottom: 16,
    overflow: 'hidden',
  },
  trustBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  violationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  violationLabel: {
    fontSize: 14,
    fontFamily: fonts.regular,
    color: lightTheme.textSecondary,
  },
  violationValue: {
    fontSize: 15,
    fontFamily: fonts.bold,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    gap: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    fontFamily: fonts.medium,
    color: '#EF4444',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 12,
  },
  securityText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: lightTheme.textSecondary,
    flex: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    paddingVertical: 16,
    borderRadius: 20,
    marginTop: 8,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: fonts.bold,
  },
});
