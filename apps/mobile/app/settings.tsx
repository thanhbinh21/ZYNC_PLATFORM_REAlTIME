import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../src/theme/colors';
import { useAuthStore } from '../src/store/useAuthStore';
import { socketService } from '../src/services/socket';
import api from '../src/services/api';

export default function SettingsScreen() {
  const router = useRouter();
  const userInfo = useAuthStore((s) => s.userInfo);
  const logout = useAuthStore((s) => s.logout);

  // Cau hinh giao dien
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Cau hinh thong bao
  const [notifyMessages, setNotifyMessages] = useState(true);
  const [notifyFriends, setNotifyFriends] = useState(true);
  const [notifyStories, setNotifyStories] = useState(true);
  const [notifySounds, setNotifySounds] = useState(true);

  // Quyen rieng tu
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [showReadReceipts, setShowReadReceipts] = useState(true);

  const handleLogout = useCallback(() => {
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
          } catch {
            await logout();
            router.replace('/(auth)/login');
          }
        },
      },
    ]);
  }, [logout, router]);

  // Muc cau hinh tai khoan
  const accountItems = [
    {
      icon: 'person-outline' as const,
      label: 'Chỉnh sửa hồ sơ',
      color: lightTheme.accent,
    },
    {
      icon: 'key-outline' as const,
      label: 'Đổi mật khẩu',
      color: '#3b82f6',
    },
    {
      icon: 'shield-checkmark-outline' as const,
      label: 'Bảo mật 2 bước',
      color: '#f59e0b',
    },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={lightTheme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cài đặt</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Thong tin tai khoan */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <View style={styles.card}>
            {accountItems.map((item, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.menuItem, idx < accountItems.length - 1 && styles.menuItemBorder]}
              >
                <View style={[styles.menuIconBox, { backgroundColor: `${item.color}15` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={lightTheme.textTertiary} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Giao dien */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Giao diện</Text>
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Ionicons name="moon-outline" size={20} color="#8b5cf6" />
                <Text style={styles.switchLabel}>Chế độ tối</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={setIsDarkMode}
                trackColor={{ false: lightTheme.border, true: lightTheme.accent }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Thong bao */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông báo</Text>
          <View style={styles.card}>
            <View style={[styles.switchRow, styles.menuItemBorder]}>
              <View style={styles.switchInfo}>
                <Ionicons name="chatbubble-outline" size={20} color={lightTheme.accent} />
                <Text style={styles.switchLabel}>Tin nhắn</Text>
              </View>
              <Switch
                value={notifyMessages}
                onValueChange={setNotifyMessages}
                trackColor={{ false: lightTheme.border, true: lightTheme.accent }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.switchRow, styles.menuItemBorder]}>
              <View style={styles.switchInfo}>
                <Ionicons name="people-outline" size={20} color="#3b82f6" />
                <Text style={styles.switchLabel}>Lời mời kết bạn</Text>
              </View>
              <Switch
                value={notifyFriends}
                onValueChange={setNotifyFriends}
                trackColor={{ false: lightTheme.border, true: lightTheme.accent }}
                thumbColor="#fff"
              />
            </View>
            <View style={[styles.switchRow, styles.menuItemBorder]}>
              <View style={styles.switchInfo}>
                <Ionicons name="flash-outline" size={20} color="#f59e0b" />
                <Text style={styles.switchLabel}>Khoảnh khắc</Text>
              </View>
              <Switch
                value={notifyStories}
                onValueChange={setNotifyStories}
                trackColor={{ false: lightTheme.border, true: lightTheme.accent }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Ionicons name="volume-high-outline" size={20} color="#ec4899" />
                <Text style={styles.switchLabel}>Âm thanh</Text>
              </View>
              <Switch
                value={notifySounds}
                onValueChange={setNotifySounds}
                trackColor={{ false: lightTheme.border, true: lightTheme.accent }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Quyen rieng tu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quyền riêng tư</Text>
          <View style={styles.card}>
            <View style={[styles.switchRow, styles.menuItemBorder]}>
              <View style={styles.switchInfo}>
                <Ionicons name="radio-button-on-outline" size={20} color={lightTheme.accent} />
                <Text style={styles.switchLabel}>Trạng thái online</Text>
              </View>
              <Switch
                value={showOnlineStatus}
                onValueChange={setShowOnlineStatus}
                trackColor={{ false: lightTheme.border, true: lightTheme.accent }}
                thumbColor="#fff"
              />
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Ionicons name="checkmark-done-outline" size={20} color="#3b82f6" />
                <Text style={styles.switchLabel}>Xác nhận đã đọc</Text>
              </View>
              <Switch
                value={showReadReceipts}
                onValueChange={setShowReadReceipts}
                trackColor={{ false: lightTheme.border, true: lightTheme.accent }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Thong tin ung dung */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin</Text>
          <View style={styles.card}>
            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
              <View style={[styles.menuIconBox, { backgroundColor: '#06b6d415' }]}>
                <Ionicons name="help-circle-outline" size={20} color="#06b6d4" />
              </View>
              <Text style={styles.menuLabel}>Trợ giúp & Phản hồi</Text>
              <Ionicons name="chevron-forward" size={18} color={lightTheme.textTertiary} />
            </TouchableOpacity>
            <View style={styles.menuItem}>
              <View style={[styles.menuIconBox, { backgroundColor: '#64748b15' }]}>
                <Ionicons name="information-circle-outline" size={20} color="#64748b" />
              </View>
              <Text style={styles.menuLabel}>Phiên bản</Text>
              <Text style={styles.versionText}>1.0.0</Text>
            </View>
          </View>
        </View>

        {/* Dang xuat */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: lightTheme.bgPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTheme.borderLight,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: lightTheme.textPrimary,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: lightTheme.textTertiary,
    fontFamily: 'BeVietnamPro_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: lightTheme.bgCard,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: lightTheme.borderLight,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTheme.borderLight,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: lightTheme.textPrimary,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  switchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  switchLabel: {
    fontSize: 15,
    color: lightTheme.textPrimary,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  versionText: {
    fontSize: 14,
    color: lightTheme.textTertiary,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 30,
    paddingVertical: 14,
    backgroundColor: '#fef2f215',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#fca5a520',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
});
