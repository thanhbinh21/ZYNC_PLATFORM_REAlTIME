import React, { useCallback, useEffect, useState } from 'react';
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
import { useAppPreferencesStore } from '../store/useAppPreferencesStore';
import { getAppTheme } from '../theme/get-app-theme';
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

interface StoryBarProps {
  currentUserId: string;
  currentUserName: string;
  onCreateStory: () => void;
  onViewStory: (feedIndex: number) => void;
  onViewMyStory: () => void;
}

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
  const mode = useAppPreferencesStore((s) => s.theme);
  const theme = getAppTheme(mode);
  const { feed, myStories, loading } = useStoryFeed(currentUserId);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.shimmer, { backgroundColor: theme.bgHover }]} />
        <View style={[styles.shimmer, { backgroundColor: theme.bgHover }]} />
        <View style={[styles.shimmer, { backgroundColor: theme.bgHover }]} />
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
                {
                  backgroundColor: theme.bgHover,
                  borderWidth: myStories.length > 0 ? 2.5 : 1.5,
                  borderColor: myStories.length > 0 ? theme.accent : theme.border,
                  borderStyle: myStories.length > 0 ? 'solid' : 'dashed',
                },
              ]}
            >
              {myStories.length > 0 ? (
                <Text style={[styles.avatarInitial, { color: theme.textPrimary }]}>
                  {currentUserName.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="add" size={24} color={theme.accent} />
              )}
            </View>
            <Text style={[styles.storyName, { color: theme.textSecondary }]} numberOfLines={1}>
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
                  {
                    backgroundColor: theme.bgHover,
                    borderWidth: hasUnviewed ? 2.5 : 2,
                    borderColor: hasUnviewed ? theme.accent : theme.borderLight,
                  },
                ]}
              >
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarInitial, { color: theme.textPrimary }]}>{initial}</Text>
                )}
              </View>
              <Text style={[styles.storyName, { color: theme.textSecondary }]} numberOfLines={1}>
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
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '600',
  },
  storyName: {
    fontSize: 11,
    fontFamily: 'BeVietnamPro_400Regular',
    textAlign: 'center',
  },
});
