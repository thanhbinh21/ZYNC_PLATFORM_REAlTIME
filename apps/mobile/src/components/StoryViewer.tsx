import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  StatusBar,
  Pressable,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lightTheme } from '../theme/colors';
import api from '../services/api';

interface Story {
  _id: string;
  userId: string;
  mediaType: 'text' | 'image' | 'video';
  mediaUrl?: string;
  content?: string;
  backgroundColor?: string;
  fontStyle?: string;
  viewerIds?: string[];
  reactions?: Record<string, number>;
  expiresAt: string;
  createdAt: string;
}

interface StoryFeedGroup {
  userId: string;
  displayName: string;
  avatarUrl?: string;
  stories: Story[];
}

interface StoryViewerProps {
  visible: boolean;
  feed: StoryFeedGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onReact?: (storyId: string, emoji: string) => void;
  onReply?: (storyId: string, text: string) => void;
  onView?: (storyId: string) => void;
  onDelete?: (storyId: string) => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const STORY_DURATION = 5000; // 5 giay moi story

export function StoryViewer({
  visible,
  feed,
  initialGroupIndex,
  currentUserId,
  onClose,
  onReact,
  onReply,
  onView,
  onDelete,
}: StoryViewerProps) {
  const insets = useSafeAreaInsets();
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [replyText, setReplyText] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset vi tri khi mo viewer
  useEffect(() => {
    if (visible) {
      setGroupIndex(initialGroupIndex);
      setStoryIndex(0);
    }
  }, [visible, initialGroupIndex]);

  const currentGroup = feed[groupIndex];
  const currentStory = currentGroup?.stories[storyIndex];
  const isMyStory = currentGroup?.userId === currentUserId;

  // Danh dau da xem story
  useEffect(() => {
    if (!visible || !currentStory) return;
    if (onView && !currentStory.viewerIds?.includes(currentUserId)) {
      onView(currentStory._id);
    }
  }, [visible, currentStory, currentUserId, onView]);

  // Auto-advance timer
  useEffect(() => {
    if (!visible || !currentStory) return;

    progressAnim.setValue(0);
    const anim = Animated.timing(progressAnim, {
      toValue: 1,
      duration: STORY_DURATION,
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (finished) {
        goNext();
      }
    });

    return () => {
      anim.stop();
    };
  }, [visible, groupIndex, storyIndex]);

  const goNext = useCallback(() => {
    if (!currentGroup) {
      onClose();
      return;
    }

    if (storyIndex < currentGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (groupIndex < feed.length - 1) {
      setGroupIndex(groupIndex + 1);
      setStoryIndex(0);
    } else {
      onClose();
    }
  }, [currentGroup, feed.length, groupIndex, onClose, storyIndex]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (groupIndex > 0) {
      setGroupIndex(groupIndex - 1);
      setStoryIndex(0);
    }
  }, [groupIndex, storyIndex]);

  const handleTap = useCallback(
    (x: number) => {
      // Tap nua trai -> lui, tap nua phai -> tien
      if (x < SCREEN_WIDTH * 0.3) {
        goPrev();
      } else {
        goNext();
      }
    },
    [goNext, goPrev],
  );

  const handleReply = useCallback(() => {
    if (!replyText.trim() || !currentStory) return;
    onReply?.(currentStory._id, replyText.trim());
    setReplyText('');
  }, [currentStory, onReply, replyText]);

  if (!visible || !currentGroup || !currentStory) return null;

  const storiesCount = currentGroup.stories.length;
  const initial = (currentGroup.displayName || '?').charAt(0).toUpperCase();
  const isTextStory = currentStory.mediaType === 'text';

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <StatusBar hidden />
      <View style={styles.root}>
        {/* Background */}
        {isTextStory ? (
          <View
            style={[
              styles.fullBg,
              { backgroundColor: currentStory.backgroundColor || '#1e293b' },
            ]}
          >
            <Text style={styles.textStoryContent}>{currentStory.content}</Text>
          </View>
        ) : currentStory.mediaUrl ? (
          <Image
            source={{ uri: currentStory.mediaUrl }}
            style={styles.fullBg}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.fullBg, { backgroundColor: '#0f172a' }]} />
        )}

        {/* Overlay tap zones */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => handleTap(e.nativeEvent.locationX)}
        />

        {/* Progress bars */}
        <View style={[styles.progressRow, { top: insets.top + 8 }]}>
          {Array.from({ length: storiesCount }).map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < storyIndex
                        ? '100%'
                        : i === storyIndex
                          ? progressAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            })
                          : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={[styles.header, { top: insets.top + 24 }]}>
          <View style={styles.headerUser}>
            {currentGroup.avatarUrl ? (
              <Image source={{ uri: currentGroup.avatarUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={[styles.headerAvatar, styles.headerAvatarFallback]}>
                <Text style={styles.headerAvatarLetter}>{initial}</Text>
              </View>
            )}
            <View>
              <Text style={styles.headerName}>{currentGroup.displayName}</Text>
              <Text style={styles.headerTime}>
                {new Date(currentStory.createdAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            {isMyStory && onDelete && (
              <TouchableOpacity
                onPress={() => onDelete(currentStory._id)}
                style={styles.headerBtn}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Reactions */}
        {!isMyStory && (
          <View style={[styles.bottomBar, { bottom: insets.bottom + 12 }]}>
            <View style={styles.replyRow}>
              <TextInput
                style={styles.replyInput}
                placeholder="Phản hồi..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={replyText}
                onChangeText={setReplyText}
                returnKeyType="send"
                onSubmitEditing={handleReply}
              />
              <View style={styles.reactRow}>
                {['❤️', '🔥', '😂', '😮'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => onReact?.(currentStory._id, emoji)}
                    style={styles.reactBtn}
                  >
                    <Text style={styles.reactEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullBg: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textStoryContent: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 32,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  progressRow: {
    position: 'absolute',
    left: 8,
    right: 8,
    flexDirection: 'row',
    gap: 3,
    zIndex: 10,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  header: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  headerAvatarFallback: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarLetter: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  headerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  headerTime: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    padding: 4,
  },
  bottomBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 10,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  replyInput: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
  },
  reactRow: {
    flexDirection: 'row',
    gap: 4,
  },
  reactBtn: {
    padding: 4,
  },
  reactEmoji: {
    fontSize: 22,
  },
});
