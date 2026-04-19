import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { AppNotification, NotificationAnchorRect } from '../services/notifications';
import { colors } from '../theme/colors';

const SCREEN = Dimensions.get('window');
const PANEL_MAX_W = 380;
const GAP = 8;

const TYPE_ICONS: Record<AppNotification['type'], string> = {
  new_message: '💬',
  friend_request: '🤝',
  friend_accepted: '🎉',
  group_invite: '👥',
  story_reaction: '❤️',
  story_reply: '💭',
};

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Vừa xong';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

interface NotificationsSheetProps {
  visible: boolean;
  anchorRect: NotificationAnchorRect | null;
  onClose: () => void;
  notifications: AppNotification[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onMarkRead: (ids: string[]) => void;
  onMarkAllRead: () => void;
}

function computeDropdownLayout(
  anchor: NotificationAnchorRect | null,
  insets: { top: number; bottom: number },
): { top: number; left: number; width: number; listMaxHeight: number } {
  const margin = 12;
  const panelW = Math.min(PANEL_MAX_W, SCREEN.width - margin * 2);

  if (anchor) {
    const top = anchor.pageY + anchor.height + GAP;
    let left = anchor.pageX + anchor.width - panelW;
    left = Math.max(margin, Math.min(left, SCREEN.width - margin - panelW));
    const availableBelow = SCREEN.height - top - insets.bottom - margin;
    const listMaxHeight = Math.min(420, Math.max(160, availableBelow - 52));
    return { top, left, width: panelW, listMaxHeight };
  }

  const top = insets.top + margin + 44;
  const left = SCREEN.width - margin - panelW;
  const availableBelow = SCREEN.height - top - insets.bottom - margin;
  const listMaxHeight = Math.min(420, Math.max(160, availableBelow - 52));
  return { top, left, width: panelW, listMaxHeight };
}

export function NotificationsSheet({
  visible,
  anchorRect,
  onClose,
  notifications,
  isLoading,
  hasMore,
  onLoadMore,
  onMarkRead,
  onMarkAllRead,
}: NotificationsSheetProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const layout = useMemo(
    () => computeDropdownLayout(anchorRect, { top: insets.top, bottom: insets.bottom }),
    [anchorRect, insets.top, insets.bottom],
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handlePressItem = useCallback(
    (n: AppNotification) => {
      if (!n.read) onMarkRead([n._id]);
      onClose();

      if (n.conversationId) {
        router.push({
          pathname: '/chat-room',
          params: {
            conversationId: n.conversationId,
            name: n.title.replace(/^Tin nhắn mới từ\s+/i, '').replace(/^Nhóm:\s*/i, '') || 'Chat',
            avatarUrl: '',
            isGroup: n.type === 'group_invite' || n.title.toLowerCase().includes('nhóm') ? 'true' : 'false',
          },
        });
        return;
      }

      if (n.type === 'friend_request' || n.type === 'friend_accepted') {
        router.push('/(tabs)/friends');
      }
    },
    [onClose, onMarkRead, router],
  );

  const renderItem = useCallback(
    ({ item }: { item: AppNotification }) => (
      <TouchableOpacity
        style={[styles.row, !item.read && styles.rowUnread]}
        onPress={() => handlePressItem(item)}
        activeOpacity={0.75}
      >
        <View style={styles.dotCol}>
          {!item.read ? <View style={styles.dot} /> : <View style={styles.dotPlaceholder} />}
        </View>
        <Text style={styles.emoji}>{TYPE_ICONS[item.type] ?? '🔔'}</Text>
        <View style={styles.textCol}>
          <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.body} numberOfLines={2}>
            {item.body}
          </Text>
          <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#4e8873" />
      </TouchableOpacity>
    ),
    [handlePressItem],
  );

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.backdrop} onPress={onClose}>
          <BlurView intensity={35} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>

        <View
          style={[
            styles.dropdown,
            {
              top: layout.top,
              left: layout.left,
              width: layout.width,
              maxHeight: layout.listMaxHeight + 52 + 12,
            },
          ]}
          pointerEvents="box-none"
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Thông báo</Text>
            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <TouchableOpacity onPress={onMarkAllRead} hitSlop={8}>
                  <Text style={styles.markAll}>Đọc hết</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color="#cdece0" />
              </TouchableOpacity>
            </View>
          </View>

          {notifications.length === 0 && !isLoading && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🔔</Text>
              <Text style={styles.emptyText}>Không có thông báo</Text>
            </View>
          )}

          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            onEndReached={() => {
              if (hasMore && !isLoading) onLoadMore();
            }}
            onEndReachedThreshold={0.35}
            style={[styles.list, { maxHeight: layout.listMaxHeight }]}
            contentContainerStyle={styles.listContent}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            ListFooterComponent={
              isLoading && notifications.length > 0 ? (
                <ActivityIndicator color="#30d7ab" style={{ paddingVertical: 12 }} />
              ) : null
            }
          />

          {isLoading && notifications.length === 0 && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#30d7ab" />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: colors.glassPanelStrong,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(13, 50, 40, 0.85)',
  },
  headerTitle: {
    color: '#e4fff5',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  markAll: {
    color: '#43e6b8',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  list: {},
  listContent: {
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10, 46, 37, 0.65)',
    gap: 8,
  },
  rowUnread: {
    backgroundColor: 'rgba(8, 42, 34, 0.55)',
  },
  dotCol: {
    width: 10,
    paddingTop: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#30d7ab',
  },
  dotPlaceholder: {
    width: 7,
    height: 7,
  },
  emoji: {
    fontSize: 16,
    marginTop: 2,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: '#a3c7b9',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_600SemiBold',
    lineHeight: 18,
  },
  titleUnread: {
    color: '#e4fff5',
  },
  body: {
    color: '#7cb3a1',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 3,
    lineHeight: 15,
  },
  time: {
    color: '#4e8873',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 4,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 16,
  },
  emptyEmoji: {
    fontSize: 32,
    opacity: 0.45,
    marginBottom: 6,
  },
  emptyText: {
    color: '#6d9e8e',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  loadingBox: {
    paddingVertical: 28,
    alignItems: 'center',
  },
});
