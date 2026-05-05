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
import { useAppPreferencesStore } from '../src/store/useAppPreferencesStore';
import { getAppTheme } from '../src/theme/get-app-theme';
import { useNotifications } from '../src/hooks/useNotifications';
import { useAuthStore } from '../src/store/useAuthStore';
import type { AppNotification } from '../src/services/notifications';

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
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);
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

  const handlePress = useCallback(
    (item: AppNotification) => {
      if (!item.read) {
        void markRead([item._id]);
      }
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
      let icon = 'notifications';
      let color = theme.textTertiary;
      switch (item.type) {
        case 'new_message': icon = 'chatbubble'; color = theme.info; break;
        case 'friend_request': icon = 'person-add'; color = theme.accent; break;
        case 'friend_accepted': icon = 'people'; color = theme.violet; break;
        case 'group_invite': icon = 'chatbubbles'; color = theme.warning; break;
        case 'story_reaction': icon = 'heart'; color = theme.danger; break;
        case 'story_reply': icon = 'chatbox'; color = theme.pink; break;
      }
      return (
        <TouchableOpacity
          style={[styles.item, !item.read && { backgroundColor: theme.bgActive }]}
          activeOpacity={0.7}
          onPress={() => handlePress(item)}
        >
          <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={20} color={color} />
          </View>
          <View style={styles.itemContent}>
            <Text style={[styles.itemTitle, !item.read && styles.itemTitleBold]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.itemBody, { color: theme.textSecondary }]} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={[styles.itemTime, { color: theme.textTertiary }]}>{timeAgo(item.createdAt)}</Text>
          </View>
          {!item.read && <View style={[styles.unreadDot, { backgroundColor: theme.accent }]} />}
        </TouchableOpacity>
      );
    },
    [handlePress, theme],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bgPrimary }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.borderLight }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Thông báo{unreadCount > 0 ? ` (${unreadCount})` : ''}
        </Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={[styles.markAllText, { color: theme.accent }]}>Đọc hết</Text>
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
            tintColor={theme.accent}
            colors={[theme.accent]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              size="large"
              color={theme.accent}
              style={{ marginTop: 80 }}
            />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="notifications-off-outline" size={48} color={theme.textTertiary} />
              <Text style={[styles.emptyText, { color: theme.textTertiary }]}>Không có thông báo nào</Text>
            </View>
          )
        }
        ListFooterComponent={
          hasMore && notifications.length > 0 ? (
            <ActivityIndicator
              size="small"
              color={theme.accent}
              style={{ paddingVertical: 20 }}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 30 }}
        ItemSeparatorComponent={() => (
          <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: theme.borderLight }} />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  markAllBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  markAllText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemContent: { flex: 1 },
  itemTitle: {
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  itemTitleBold: { fontWeight: '700', fontFamily: 'BeVietnamPro_700Bold' },
  itemBody: {
    fontSize: 13,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
  itemTime: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: 'BeVietnamPro_400Regular',
  },
});
