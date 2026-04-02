import { useState, useEffect } from 'react';
import { apiClient } from '@/services/api';
import type { DashboardHomeMockData } from '@/components/home-dashboard/home-dashboard.types';
import { DASHBOARD_HOME_MOCK_DATA } from '@/components/home-dashboard/mock-data';

export function useHomeDashboard() {
  const [data, setData] = useState<DashboardHomeMockData>(DASHBOARD_HOME_MOCK_DATA);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [meRes, requestsRes, convosRes] = await Promise.all([
          apiClient.get('/api/users/me'),
          apiClient.get('/api/friends/requests'),
          apiClient.get('/api/conversations')
        ]);

        const user = meRes.data.user;
        setUserId(user._id as string);
        const pendingRequests = requestsRes.data.pendingRequests || [];
        const conversations = convosRes.data.data || [];

        let unreadMessagesCount = 0;
        let activeGroupsCount = 0;
        const activities: any[] = [];

        conversations.forEach((conv: any, index: number) => {
          if (conv.type === 'group') activeGroupsCount++;
          
          const unreadForMe = conv.unreadCounts?.[user._id] || 0;
          unreadMessagesCount += unreadForMe;

          if (conv.lastMessage && conv.lastMessage.content) {
            // Tìm ngươì gửi từ list users của conversation
            const sender = conv.users?.find((u: any) => u._id === conv.lastMessage.senderId);
            
            let title = sender?.displayName || 'Người dùng';
            let messageStr = conv.lastMessage.content;
            
            if (conv.type === 'group') {
              title = conv.name || 'Nhóm';
              messageStr = `${sender?.displayName || 'Ai đó'}: ${messageStr}`;
            }

            // Fallback initials
            let initials = 'U';
            if (sender?.displayName) {
              const parts = sender.displayName.split(' ');
              initials = parts.length > 1 
                ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() 
                : parts[0].substring(0, 2).toUpperCase();
            }

            const tones = ['bg-[#97a7b8]', 'bg-[#88b3c8]', 'bg-[#1a6f58]', 'bg-[#0f5845]'];

            activities.push({
              id: `act-${conv._id}-${index}`,
              title,
              message: messageStr,
              timeLabel: new Date(conv.lastMessage.sentAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
              initials,
              toneClass: tones[index % tones.length],
              isUnread: unreadForMe > 0,
            });
          }
        });

        const userInitials = user.displayName.split(' ').length > 1
          ? `${user.displayName.split(' ')[0][0]}${user.displayName.split(' ').slice(-1)[0][0]}`.toUpperCase()
          : user.displayName.substring(0, 2).toUpperCase();

        setData(prev => ({
          ...prev,
          user: {
            displayName: user.displayName,
            roleLabel: 'Trực tuyến',
            initials: userInitials,
          },
          stats: [
            { 
              id: 'stat-1', 
              value: unreadMessagesCount.toString().padStart(2, '0'), 
              label: 'Số tin nhắn mới', 
              badge: unreadMessagesCount > 0 ? `+${unreadMessagesCount}` : '', 
              icon: 'message' 
            },
            { 
              id: 'stat-2', 
              value: pendingRequests.length.toString().padStart(2, '0'), 
              label: 'Lời mời kết bạn', 
              badge: pendingRequests.length > 0 ? pendingRequests.length.toString() : '', 
              icon: 'friends' 
            },
            { 
              id: 'stat-3', 
              value: activeGroupsCount.toString().padStart(2, '0'), 
              label: 'Nhóm đang hoạt động', 
              badge: '', 
              icon: 'group' 
            },
          ],
          activities: activities.slice(0, 5),
        }));
      } catch (error) {
        console.error('Failed to fetch dashboard data', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, userId };
}
