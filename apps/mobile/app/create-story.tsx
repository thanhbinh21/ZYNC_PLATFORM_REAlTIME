import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { lightTheme } from '../src/theme/colors';
import api from '../src/services/api';

// Mau nen cho text story
const BG_COLORS = [
  '#1e293b', '#059669', '#2563eb', '#7c3aed',
  '#db2777', '#ea580c', '#0891b2', '#4f46e5',
];

export default function CreateStoryScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Chon anh tu thu vien
  const pickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
        aspect: [9, 16],
      });

      if (!result.canceled && result.assets?.length) {
        setImageUri(result.assets[0].uri);
        setMode('image');
      }
    } catch (err) {
      console.error('Pick image failed:', err);
    }
  }, []);

  // Upload anh va tao story
  const handlePublish = useCallback(async () => {
    if (mode === 'text' && !text.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập nội dung story');
      return;
    }

    try {
      setIsUploading(true);

      if (mode === 'text') {
        await api.post('/stories', {
          mediaType: 'text',
          content: text.trim(),
          backgroundColor: bgColor,
        });
      } else if (imageUri) {
        // Upload anh len Cloudinary truoc
        const signRes = await api.post('/upload/generate-signature', { type: 'image' });
        const { signature, timestamp, apiKey, cloudName, folder } = signRes.data;

        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `story-${Date.now()}.jpg`,
        } as any);
        formData.append('api_key', apiKey);
        formData.append('timestamp', String(timestamp));
        formData.append('signature', signature);
        formData.append('folder', folder);

        const cloudRes = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
          { method: 'POST', body: formData },
        );
        const cloudData = await cloudRes.json();

        if (!cloudData?.public_id) {
          throw new Error('Upload failed');
        }

        const verifyRes = await api.post('/upload/verify', {
          publicId: cloudData.public_id,
          type: 'image',
        });

        await api.post('/stories', {
          mediaType: 'image',
          mediaUrl: verifyRes.data?.secureUrl,
          content: text.trim() || undefined,
        });
      }

      router.back();
    } catch (err) {
      console.error('Create story failed:', err);
      Alert.alert('Lỗi', 'Không thể tạo story. Vui lòng thử lại.');
    } finally {
      setIsUploading(false);
    }
  }, [bgColor, imageUri, mode, router, text]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={lightTheme.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tạo khoảnh khắc</Text>
          <TouchableOpacity
            style={[styles.publishBtn, isUploading && styles.publishBtnDisabled]}
            onPress={handlePublish}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.publishBtnText}>Đăng</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'text' && styles.modeBtnActive]}
            onPress={() => setMode('text')}
          >
            <Ionicons name="text" size={18} color={mode === 'text' ? '#fff' : lightTheme.textSecondary} />
            <Text style={[styles.modeLabel, mode === 'text' && styles.modeLabelActive]}>Văn bản</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'image' && styles.modeBtnActive]}
            onPress={pickImage}
          >
            <Ionicons name="image" size={18} color={mode === 'image' ? '#fff' : lightTheme.textSecondary} />
            <Text style={[styles.modeLabel, mode === 'image' && styles.modeLabelActive]}>Ảnh</Text>
          </TouchableOpacity>
        </View>

        {/* Preview */}
        <View style={styles.previewContainer}>
          {mode === 'text' ? (
            <View style={[styles.previewBox, { backgroundColor: bgColor }]}>
              <TextInput
                style={styles.storyTextInput}
                placeholder="Viết gì đó..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={text}
                onChangeText={setText}
                multiline
                textAlignVertical="center"
                textAlign="center"
                maxLength={200}
              />
            </View>
          ) : imageUri ? (
            <View style={styles.previewBox}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
              <TextInput
                style={styles.captionInput}
                placeholder="Thêm chú thích..."
                placeholderTextColor={lightTheme.textTertiary}
                value={text}
                onChangeText={setText}
                maxLength={120}
              />
            </View>
          ) : (
            <View style={[styles.previewBox, { backgroundColor: lightTheme.bgHover }]}>
              <Ionicons name="image-outline" size={48} color={lightTheme.textTertiary} />
              <Text style={styles.pickHint}>Chạm để chọn ảnh</Text>
            </View>
          )}
        </View>

        {/* Background color picker – chi hien khi text mode */}
        {mode === 'text' && (
          <View style={styles.colorRow}>
            {BG_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorDot,
                  { backgroundColor: color },
                  bgColor === color && styles.colorDotActive,
                ]}
                onPress={() => setBgColor(color)}
              />
            ))}
          </View>
        )}
      </KeyboardAvoidingView>
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
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: lightTheme.textPrimary,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  publishBtn: {
    backgroundColor: lightTheme.accent,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  publishBtnDisabled: {
    opacity: 0.6,
  },
  publishBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: lightTheme.bgHover,
  },
  modeBtnActive: {
    backgroundColor: lightTheme.accent,
  },
  modeLabel: {
    fontSize: 13,
    color: lightTheme.textSecondary,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  modeLabelActive: {
    color: '#fff',
  },
  previewContainer: {
    flex: 1,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  previewBox: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  storyTextInput: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 24,
    width: '100%',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  captionInput: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  pickHint: {
    color: lightTheme.textTertiary,
    fontSize: 14,
    marginTop: 12,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  colorDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  colorDotActive: {
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
