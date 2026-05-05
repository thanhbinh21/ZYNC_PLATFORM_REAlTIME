import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Image,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { Comment } from '../services/posts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CommentSheetProps {
  visible: boolean;
  comments: Comment[];
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (content: string) => Promise<void>;
}

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

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <View style={styles.commentItem}>
      {comment.author?.avatarUrl ? (
        <Image
          source={{ uri: comment.author.avatarUrl }}
          style={styles.avatar}
        />
      ) : (
        <View style={[styles.avatar, styles.avatarFallback]}>
          <Text style={styles.avatarText}>
            {(comment.author?.displayName || 'U').slice(0, 1).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.commentBody}>
        <View style={styles.commentBubble}>
          <Text style={styles.authorName}>
            {comment.author?.displayName || 'Nguoi dung'}
          </Text>
          <Text style={styles.commentContent}>{comment.content}</Text>
          {comment.codeSnippet && (
            <View style={styles.codeSnippet}>
              <Text style={styles.codeText}>{comment.codeSnippet}</Text>
            </View>
          )}
        </View>
        <Text style={styles.commentTime}>
          {formatTimeAgo(comment.createdAt)} · Thich
        </Text>
      </View>
    </View>
  );
}

export function CommentSheet({
  visible,
  comments,
  isLoading,
  onClose,
  onSubmit,
}: CommentSheetProps) {
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    try {
      await onSubmit(text.trim());
      setText('');
    } finally {
      setIsSubmitting(false);
    }
  }, [text, onSubmit]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Binh luan ({comments.length})
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Comments list */}
          <FlatList
            data={comments}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <CommentItem comment={item} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  {isLoading ? 'Dang tai binh luan...' : 'Chua co binh luan nao'}
                </Text>
              </View>
            }
          />

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Viet binh luan..."
              placeholderTextColor={colors.textSubtle}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              style={[
                styles.sendButton,
                (!text.trim() || isSubmitting) && styles.sendButtonDisabled,
              ]}
            >
              <Send
                size={18}
                color={
                  text.trim() && !isSubmitting
                    ? colors.primary
                    : colors.textSubtle
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '70%',
    paddingBottom: 34,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.glassBorder,
  },
  headerTitle: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 18,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 12,
  },
  commentBody: {
    flex: 1,
  },
  commentBubble: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    padding: 10,
  },
  authorName: {
    color: colors.primary,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    marginBottom: 3,
  },
  commentContent: {
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  codeSnippet: {
    backgroundColor: colors.backgroundDeep,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  codeText: {
    color: colors.primary,
    fontFamily: 'JetBrainsMono-Regular',
    fontSize: 12,
  },
  commentTime: {
    color: colors.textSubtle,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 4,
    marginLeft: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.glassSoft,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
