import React, { memo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Heart, MessageCircle, Bookmark } from 'lucide-react-native';
import type { Post } from '../services/posts';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface PostCardProps {
  post: Post;
  onPress: (post: Post) => void;
  onLike: (postId: string) => void;
  onBookmark: (postId: string) => void;
  onAuthorPress?: (authorId: string) => void;
}

const POST_TYPE_LABELS: Record<string, string> = {
  discussion: 'Thao luan',
  question: 'Hoi dap',
  til: 'TIL',
  showcase: 'Showcase',
  tutorial: 'Huong dan',
  job: 'Tuyen dung',
};

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Vua xong';
  if (minutes < 60) return `${minutes} phut truoc`;
  if (hours < 24) return `${hours} gio truoc`;
  return `${days} ngay truoc`;
}

function PostCardComponent({
  post,
  onPress,
  onLike,
  onBookmark,
  onAuthorPress,
}: PostCardProps) {
  const handlePress = useCallback(() => {
    onPress(post);
  }, [onPress, post]);

  const handleAuthorPress = useCallback(() => {
    onAuthorPress?.(post.authorId);
  }, [onAuthorPress, post.authorId]);

  const handleLike = useCallback(() => {
    onLike(post._id);
  }, [onLike, post._id]);

  const handleBookmark = useCallback(() => {
    onBookmark(post._id);
  }, [onBookmark, post._id]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      style={styles.container}
    >
      {/* Author row */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleAuthorPress}
        style={styles.authorRow}
      >
        {post.author?.avatarUrl ? (
          <Image
            source={{ uri: post.author.avatarUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarText}>
              {(post.author?.displayName || 'U').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {post.author?.displayName || 'Nguoi dung'}
          </Text>
          <Text style={styles.meta}>
            {formatTimeAgo(post.createdAt)}
          </Text>
        </View>
        {post.type && (
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>
              {POST_TYPE_LABELS[post.type] || post.type}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {post.title}
        </Text>
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {post.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
        <Text style={styles.body} numberOfLines={3}>
          {post.content}
        </Text>
      </View>

      {/* Media */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <Image
          source={{ uri: post.mediaUrls[0] }}
          style={styles.media}
          resizeMode="cover"
        />
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLike}
          style={styles.actionButton}
        >
          <Heart
            size={16}
            color={post.isLiked ? colors.danger : colors.textMuted}
            fill={post.isLiked ? colors.danger : 'transparent'}
          />
          <Text
            style={[
              styles.actionCount,
              post.isLiked && { color: colors.danger },
            ]}
          >
            {post.likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          style={styles.actionButton}
        >
          <MessageCircle size={16} color={colors.textMuted} />
          <Text style={styles.actionCount}>{post.commentsCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleBookmark}
          style={styles.actionButton}
        >
          <Bookmark
            size={16}
            color={
              post.isBookmarked ? colors.accentSoft : colors.textMuted
            }
            fill={post.isBookmarked ? colors.accentSoft : 'transparent'}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export const PostCard = memo(PostCardComponent);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassPanel,
    padding: 16,
    marginBottom: 12,
    shadowColor: colors.glassShadow,
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarFallback: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: colors.text,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  meta: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 12,
    marginTop: 1,
  },
  typeTag: {
    backgroundColor: colors.glassSoft,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  typeTagText: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 11,
  },
  content: {
    marginBottom: 10,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 6,
    gap: 6,
  },
  tag: {
    backgroundColor: colors.glassUltra,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 12,
  },
  body: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  media: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorderSoft,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 4,
  },
  actionCount: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
});
