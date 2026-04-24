import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../theme/colors';
import api from '../services/api';
import { socketService } from '../services/socket';

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

interface StoryBarProps {
  currentUserId: string;
  currentUserName: string;
  onCreateStory: () => void;
  onViewStory: (feedIndex: number) => void;
  onViewMyStory: () => void;
}

// Hook lay du lieu story tu API
function useStoryFeed(currentUserId: string) {
  const [feed, setFeed] = useState<StoryFeedGroup[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/stories/feed');
      const data = res.data?.feed || res.data?.data || [];
      setFeed(data);
    } catch (err) {
      console.error('Load story feed failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyStories = useCallback(async () => {
    try {
      const res = await api.get('/stories/my');
      const data = res.data?.stories || res.data?.data || [];
      setMyStories(data);
    } catch (err) {
      console.error('Load my stories failed:', err);
    }
  }, []);

  useEffect(() => {
    if (currentUserId) {
      void loadFeed();
      void loadMyStories();
    }
  }, [currentUserId, loadFeed, loadMyStories]);

  return { feed, myStories, loading, loadFeed, loadMyStories };
}

export function StoryBar({
  currentUserId,
  currentUserName,
  onCreateStory,
  onViewStory,
  onViewMyStory,
}: StoryBarProps) {
  const { feed, myStories, loading } = useStoryFeed(currentUserId);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.shimmer} />
        <View style={styles.shimmer} />
        <View style={styles.shimmer} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={feed}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={
          <TouchableOpacity
            style={styles.storyItem}
            onPress={myStories.length > 0 ? onViewMyStory : onCreateStory}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.avatarCircle,
                myStories.length > 0 ? styles.avatarRingActive : styles.avatarRingAdd,
              ]}
            >
              {myStories.length > 0 ? (
                <Text style={styles.avatarInitial}>
                  {currentUserName.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="add" size={24} color={lightTheme.accent} />
              )}
            </View>
            <Text style={styles.storyName} numberOfLines={1}>
              {myStories.length > 0 ? 'Của bạn' : 'Thêm tin'}
            </Text>
          </TouchableOpacity>
        }
        renderItem={({ item, index }) => {
          const initial = (item.displayName || '?').charAt(0).toUpperCase();
          const hasUnviewed = item.stories.some(
            (s) => !s.viewerIds?.includes(currentUserId),
          );
          return (
            <TouchableOpacity
              style={styles.storyItem}
              onPress={() => onViewStory(index)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.avatarCircle,
                  hasUnviewed ? styles.avatarRingActive : styles.avatarRingViewed,
                ]}
              >
                {item.avatarUrl ? (
                  <Image
                    source={{ uri: item.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.avatarInitial}>{initial}</Text>
                )}
              </View>
              <Text style={styles.storyName} numberOfLines={1}>
                {item.displayName}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingLeft: 4,
  },
  shimmer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: lightTheme.bgHover,
    marginRight: 12,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 64,
  },
  avatarCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    backgroundColor: lightTheme.bgHover,
  },
  avatarRingActive: {
    borderWidth: 2.5,
    borderColor: lightTheme.accent,
  },
  avatarRingViewed: {
    borderWidth: 2,
    borderColor: lightTheme.borderLight,
  },
  avatarRingAdd: {
    borderWidth: 1.5,
    borderColor: lightTheme.border,
    borderStyle: 'dashed',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
    color: lightTheme.textPrimary,
  },
  storyName: {
    fontSize: 11,
    color: lightTheme.textSecondary,
    fontFamily: 'BeVietnamPro_400Regular',
    textAlign: 'center',
  },
});
