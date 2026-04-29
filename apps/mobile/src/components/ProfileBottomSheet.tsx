import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { MessageCircle, UserPlus } from 'lucide-react-native';
import { lightTheme } from '../theme/colors';
import api from '../services/api';

interface UserProfile {
  _id: string;
  displayName: string;
  email?: string;
  username?: string;
  avatarUrl?: string;
  bio?: string;
  friendCount?: number;
  mutualFriends?: number;
  isFriend?: boolean;
  createdAt?: string;
}

interface ProfileBottomSheetProps {
  visible: boolean;
  userId: string | null;
  currentUserId: string;
  onClose: () => void;
  onSendMessage?: (userId: string) => void;
}

export function ProfileBottomSheet({
  visible,
  userId,
  currentUserId,
  onClose,
  onSendMessage,
}: ProfileBottomSheetProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!visible || !userId) return;
    void loadProfile();
  }, [visible, userId]);

  const loadProfile = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await api.get(`/users/${userId}`);
      setProfile(res.data?.data || res.data);
    } catch (err) {
      console.error('Load profile failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = useCallback(async () => {
    if (!userId) return;
    try {
      setActionLoading(true);
      await api.post('/friends/request', { toUserId: userId });
      // Refresh profile de cap nhat trang thai
      void loadProfile();
    } catch (err) {
      console.error('Send friend request failed:', err);
    } finally {
      setActionLoading(false);
    }
  }, [userId]);

  if (!visible) return null;

  const isMe = userId === currentUserId;
  const initial = (profile?.displayName || '?').charAt(0).toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handle} />

          {loading ? (
            <ActivityIndicator
              size="large"
              color={lightTheme.accent}
              style={{ marginVertical: 60 }}
            />
          ) : profile ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Avatar + Name */}
              <View style={styles.profileHeader}>
                {profile.avatarUrl ? (
                  <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarLetter}>{initial}</Text>
                  </View>
                )}
                <Text style={styles.displayName}>{profile.displayName}</Text>
                {profile.username && (
                  <Text style={styles.username}>@{profile.username}</Text>
                )}
                {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{profile.friendCount ?? 0}</Text>
                  <Text style={styles.statLabel}>Bạn bè</Text>
                </View>
                {profile.mutualFriends !== undefined && !isMe && (
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{profile.mutualFriends}</Text>
                    <Text style={styles.statLabel}>Bạn chung</Text>
                  </View>
                )}
                {profile.createdAt && (
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>
                      {new Date(profile.createdAt).getFullYear()}
                    </Text>
                    <Text style={styles.statLabel}>Tham gia</Text>
                  </View>
                )}
              </View>

              {/* Actions */}
              {!isMe && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.primaryBtn}
                    onPress={() => {
                      onSendMessage?.(profile._id);
                      onClose();
                    }}
                  >
                    <MessageCircle size={18} stroke={lightTheme.textOnAccent} />
                    <Text style={styles.primaryBtnText}>Nhắn tin</Text>
                  </TouchableOpacity>

                  {!profile.isFriend && (
                    <TouchableOpacity
                      style={styles.secondaryBtn}
                      onPress={handleSendFriendRequest}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <ActivityIndicator size="small" color={lightTheme.accent} />
                      ) : (
                        <>
                          <UserPlus size={18} stroke={lightTheme.accent} />
                          <Text style={styles.secondaryBtnText}>Kết bạn</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* Close */}
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>Đóng</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <Text style={styles.errorText}>Không thể tải thông tin</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: lightTheme.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '75%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: lightTheme.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
  },
  avatarFallback: {
    backgroundColor: lightTheme.accentLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLetter: {
    fontSize: 30,
    fontWeight: '600',
    color: lightTheme.accent,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '700',
    color: lightTheme.textPrimary,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  username: {
    fontSize: 14,
    color: lightTheme.textTertiary,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
  bio: {
    fontSize: 13,
    color: lightTheme.textSecondary,
    fontFamily: 'BeVietnamPro_400Regular',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: lightTheme.textPrimary,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  statLabel: {
    fontSize: 11,
    color: lightTheme.textTertiary,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: lightTheme.accent,
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnText: {
    color: lightTheme.textOnAccent,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: lightTheme.accentLight,
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    color: lightTheme.accent,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  closeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeBtnText: {
    fontSize: 14,
    color: lightTheme.textTertiary,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  errorText: {
    textAlign: 'center',
    color: lightTheme.textTertiary,
    marginVertical: 40,
    fontSize: 14,
  },
});
