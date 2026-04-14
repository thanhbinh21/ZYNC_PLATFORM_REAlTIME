import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../src/theme/colors';
import api from '../../src/services/api';
import { useAuthStore } from '../../src/store/useAuthStore';

interface Friend {
  _id: string;
  id?: string;
  displayName: string;
  avatarUrl?: string;
  email?: string;
  status?: string;
}

interface FriendRequest {
  _id: string;
  id?: string;
  senderId: { _id: string; displayName: string; avatarUrl?: string };
  receiverId: string;
  status: string;
  createdAt: string;
}

export default function FriendsScreen() {
  const userInfo = useAuthStore((s) => s.userInfo);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');

  const loadFriendsData = useCallback(async () => {
    try {
      const [friendsRes, countRes, requestsRes] = await Promise.all([
        api.get('/friends').catch(() => ({ data: { friends: [] } })),
        api.get('/friends/count').catch(() => ({ data: { count: 0 } })),
        api.get('/friends/requests').catch(() => ({ data: { received: [] } })),
      ]);

      setFriends(friendsRes.data?.friends || []);
      setFriendCount(countRes.data?.count || 0);
      setRequests(requestsRes.data?.received || []);
    } catch (e) {
      console.error('Failed to load friends data:', e);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadFriendsData();
    }
  }, [isAuthenticated, loadFriendsData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadFriendsData();
  }, [loadFriendsData]);

  // Search users
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    try {
      setIsSearching(true);
      const res = await api.get('/users/search', { params: { q: query } });
      setSearchResults(res.data?.users || []);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Send friend request
  const sendFriendRequest = async (userId: string) => {
    try {
      await api.post('/friends/request', { friendId: userId });
      Alert.alert('Thành công', 'Đã gửi lời mời kết bạn');
      setSearchQuery('');
      setSearchResults([]);
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể gửi lời mời');
    }
  };

  // Accept friend request
  const acceptRequest = async (requestId: string) => {
    try {
      await api.post(`/friends/accept/${requestId}`);
      loadFriendsData();
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể chấp nhận');
    }
  };

  // Reject friend request
  const rejectRequest = async (requestId: string) => {
    try {
      await api.post(`/friends/reject/${requestId}`);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch (e: any) {
      Alert.alert('Lỗi', e.response?.data?.message || 'Không thể từ chối');
    }
  };

  const filteredFriends = searchQuery && searchQuery.length >= 2 && searchResults.length === 0 
    ? friends.filter((f) => f.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
    : friends;

  return (
    <LinearGradient
      colors={[colors.backgroundSoft, colors.backgroundMid, colors.backgroundDeep]}
      style={styles.safeArea}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Danh bạ</Text>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="person-add-outline" size={24} color="#10b981" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#64748b" style={styles.searchIcon} />
          <TextInput 
            style={styles.searchInput}
            placeholder="Tìm bạn bè hoặc người dùng..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
              <Ionicons name="close-circle" size={18} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <View style={styles.searchResultsBox}>
            <Text style={styles.listTitle}>KẾT QUẢ TÌM KIẾM</Text>
            {searchResults.map((user) => (
              <View key={user._id} style={styles.friendItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(user.displayName || '?').charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{user.displayName}</Text>
                  <Text style={styles.friendStatus}>{user.email || ''}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addFriendBtn}
                  onPress={() => sendFriendRequest(user._id)}
                >
                  <Ionicons name="person-add" size={16} color="#10b981" />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.divider} />
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'friends' && styles.tabActive]}
            onPress={() => setActiveTab('friends')}
          >
            <Text style={[styles.tabText, activeTab === 'friends' && styles.tabTextActive]}>
              Bạn bè ({friendCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'requests' && styles.tabActive]}
            onPress={() => setActiveTab('requests')}
          >
            <Text style={[styles.tabText, activeTab === 'requests' && styles.tabTextActive]}>
              Lời mời
            </Text>
            {requests.length > 0 && (
              <View style={styles.requestBadge}>
                <Text style={styles.badgeText}>{requests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#10b981" />
          </View>
        ) : activeTab === 'friends' ? (
          /* Friends List */
          <FlatList
            data={filteredFriends}
            keyExtractor={(item, index) => item._id || item.id || index.toString()}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" colors={['#10b981']} />
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.friendItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.displayName.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{item.displayName}</Text>
                  <Text style={styles.friendStatus}>{item.status || 'Offline'}</Text>
                </View>
                <TouchableOpacity style={styles.callBtn}>
                  <Ionicons name="chatbubble-outline" size={20} color="#10b981" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={64} color="#334155" />
                <Text style={styles.emptyText}>Chưa có bạn bè</Text>
                <Text style={styles.emptySubtext}>Tìm kiếm và gửi lời mời kết bạn</Text>
              </View>
            }
            contentContainerStyle={filteredFriends.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
          />
        ) : (
          /* Requests List */
          <FlatList
            data={requests}
            keyExtractor={(item, index) => item._id || item.id || index.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(item.senderId?.displayName || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.friendInfo}>
                  <Text style={styles.friendName}>{item.senderId?.displayName || 'User'}</Text>
                  <Text style={styles.friendStatus}>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => acceptRequest(item._id)}
                  >
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => rejectRequest(item._id)}
                  >
                    <Ionicons name="close" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="mail-outline" size={64} color="#334155" />
                <Text style={styles.emptyText}>Không có lời mời</Text>
                <Text style={styles.emptySubtext}>Bạn chưa nhận được lời mời kết bạn nào</Text>
              </View>
            }
            contentContainerStyle={requests.length === 0 ? { flex: 1 } : { paddingBottom: 100 }}
          />
        )}
      </View>
    </SafeAreaView>
   </LinearGradient>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHover,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 15,
    height: 45,
    marginBottom: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontFamily: 'BeVietnamPro_400Regular',
    fontSize: 15,
  },
  // ─ Tabs ─
  tabRow: {
    flexDirection: 'row',
    marginBottom: 15,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tabActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  tabText: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_500Medium',
  },
  tabTextActive: {
    color: '#10b981',
  },
  // ─ Search Results ─
  searchResultsBox: {
    marginBottom: 10,
  },
  // ─ Friend Items ─
  listTitle: {
    color: '#64748b',
    fontSize: 11,
    fontFamily: 'BeVietnamPro_600SemiBold',
    textTransform: 'uppercase',
    marginBottom: 10,
    letterSpacing: 1,
  },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 18,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#94a3b8',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  friendInfo: {
    flex: 1,
    marginLeft: 15,
  },
  friendName: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
  },
  friendStatus: {
    color: '#64748b',
    fontSize: 13,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 2,
  },
  callBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addFriendBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // ─ Request Items ─
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  requestBadge: {
    backgroundColor: '#ef4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'BeVietnamPro_700Bold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginVertical: 10,
  },
  // ─ States ─
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#475569',
    fontSize: 16,
    fontFamily: 'BeVietnamPro_600SemiBold',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    fontFamily: 'BeVietnamPro_400Regular',
    marginTop: 4,
  },
});
