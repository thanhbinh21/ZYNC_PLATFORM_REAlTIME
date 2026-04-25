import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../src/theme/colors';
import { useNotifications } from '../src/hooks/useNotifications';
import { useAuthStore } from '../src/store/useAuthStore';
import type { AppNotification } from '../src/services/notifications';

// Icon va mau theo loai thong bao
function getNotificationMeta(type: AppNotification['type']) {
  switch (type) {
    case 'new_message':
      return { icon: 'chatbubble', color: '#3b82f6' };
    case 'friend_request':
      return { icon: 'person-add', color: '#10b981' };
    case 'friend_accepted':
      return { icon: 'people', color: '#8b5cf6' };
    case 'group_invite':
      return { icon: 'chatbubbles', color: '#f59e0b' };
    case 'story_reaction':
      return { icon: 'heart', color: '#ef4444' };
    case 'story_reply':
      return { icon: 'chatbox', color: '#ec4899' };
    default:
      return { icon: 'notifications', color: '#64748b' };
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'Vừa xong';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function NotificationsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const {
    notifications,
    unreadCount,
    isLoading,
    hasMore,
    loadNotifications,
    loadMore,
    markRead,
    markAllRead,
  } = useNotifications(isAuthenticated);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  // Tap vao thong bao -> danh dau da doc va dieu huong
  const handlePress = useCallback(
    (item: AppNotification) => {
      if (!item.read) {
        void markRead([item._id]);
      }

      // Dieu huong theo loai
      if (item.conversationId && (item.type === 'new_message' || item.type === 'group_invite')) {
        router.push({
          pathname: '/chat-room',
          params: { conversationId: item.conversationId },
        });
      } else if (item.type === 'friend_request' || item.type === 'friend_accepted') {
        router.push('/(tabs)/friends');
      }
    },
    [markRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => {
      const meta = getNotificationMeta(item.type);
      return (
        <TouchableOpacity
          style={[styles.item, !item.read && styles.itemUnread]}
          activeOpacity={0.7}
          onPress={() => handlePress(item)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${meta.color}15` }]}>
            <Ionicons name={meta.icon as any} size={20} color={meta.color} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, !item.read && styles.itemTitleBold]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemBody} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.itemTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      );
    },
    [handlePress],
  );

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={lightTheme.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Thông báo{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Đọc hết</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 50 }} />
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={lightTheme.accent}
            colors={[lightTheme.accent]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color={lightTheme.accent}
              style={{ marginTop: 80 }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={lightTheme.textTertiary} />
              <Text style={styles.emptyText}>Không có thông báo nào</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && notifications.length > 0 ? (
            <ActivityIndicator
              size="small"
              color={lightTheme.accent}
              style={{ paddingVertical: 20 }}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 30 }}
      />
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
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  markAllText: {
    fontSize: 13,
    color: lightTheme.accent,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: lightTheme.borderLight,
  },
  itemUnread: {
    backgroundColor: lightTheme.bgActive,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    color: lightTheme.textPrimary,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  itemTitleBold: {
    fontWeight: '700',
    fontFamily: 'BeVietnamPro_700Bold',
  },
  itemBody: {
    fontSize: 13,
    color: lightTheme.textSecondary,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
    color: lightTheme.textTertiary,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: lightTheme.accent,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: lightTheme.textTertiary,
    fontFamily: 'BeVietnamPro_400Regular',
  },
});
