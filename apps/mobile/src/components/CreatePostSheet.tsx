import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { X, Image as ImageIcon } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { Button } from '../ui/Button';
import type { CreatePostPayload, PostType } from '../services/posts';

const POST_TYPES: { value: PostType; label: string }[] = [
  { value: 'discussion', label: 'Thao luan' },
  { value: 'question', label: 'Hoi dap' },
  { value: 'til', label: 'TIL' },
  { value: 'showcase', label: 'Showcase' },
  { value: 'tutorial', label: 'Huong dan' },
  { value: 'job', label: 'Tuyen dung' },
];

const POPULAR_TAGS = [
  'react',
  'typescript',
  'nodejs',
  'nextjs',
  'python',
  'golang',
  'rust',
  'devops',
  'ai',
  'mobile',
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CreatePostSheetProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: CreatePostPayload) => Promise<unknown>;
}

export function CreatePostSheet({
  visible,
  onClose,
  onSubmit,
}: CreatePostSheetProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<PostType>('discussion');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setTitle('');
    setContent('');
    setPostType('discussion');
    setSelectedTags([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) {
      setError('Vui long nhap tieu de');
      return;
    }
    if (!content.trim()) {
      setError('Vui long nhap noi dung');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        type: postType,
        tags: selectedTags,
      });
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Khong the tao bai viet');
    } finally {
      setIsSubmitting(false);
    }
  }, [title, content, postType, selectedTags, onSubmit, handleClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tao bai viet</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Post type selector */}
            <Text style={styles.label}>Loai bai viet</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.typeRow}
            >
              {POST_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => setPostType(type.value)}
                  style={[
                    styles.typeChip,
                    postType === type.value && styles.typeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeChipText,
                      postType === type.value && styles.typeChipTextActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title */}
            <Text style={styles.label}>Tieu de</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="Nhap tieu de bai viet..."
              placeholderTextColor={colors.textSubtle}
              value={title}
              onChangeText={setTitle}
              maxLength={200}
            />

            {/* Content */}
            <Text style={styles.label}>Noi dung</Text>
            <TextInput
              style={styles.contentInput}
              placeholder="Chia se bai viet cua ban..."
              placeholderTextColor={colors.textSubtle}
              value={content}
              onChangeText={setContent}
              multiline
              textAlignVertical="top"
            />

            {/* Tags */}
            <Text style={styles.label}>Tags (toi da 5)</Text>
            <View style={styles.tagsGrid}>
              {POPULAR_TAGS.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[
                    styles.tagChip,
                    selectedTags.includes(tag) && styles.tagChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagChipText,
                      selectedTags.includes(tag) && styles.tagChipTextActive,
                    ]}
                  >
                    #{tag}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error && (
              <Text style={styles.errorText}>{error}</Text>
            )}
          </ScrollView>

          {/* Submit */}
          <View style={styles.footer}>
            <Button
              title={isSubmitting ? 'Dang dang...' : 'Dang bai'}
              onPress={handleSubmit}
              isLoading={isSubmitting}
              disabled={!title.trim() || !content.trim()}
            />
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
    maxHeight: '90%',
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
  scrollContent: {
    paddingHorizontal: 16,
  },
  label: {
    color: colors.text,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  typeRow: {
    marginBottom: 4,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassSoft,
    marginRight: 8,
  },
  typeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  typeChipText: {
    color: colors.textMuted,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  typeChipTextActive: {
    color: colors.text,
    fontFamily: fonts.bold,
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
  },
  contentInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderRadius: 12,
    padding: 14,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    minHeight: 140,
  },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glassUltra,
  },
  tagChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagChipText: {
    color: colors.primary,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
  tagChipTextActive: {
    color: colors.text,
    fontFamily: fonts.bold,
  },
  errorText: {
    color: colors.danger,
    fontFamily: fonts.regular,
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.glassBorder,
  },
});
