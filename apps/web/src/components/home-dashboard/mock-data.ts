import type { DashboardHomeMockData } from './home-dashboard.types';

export const DASHBOARD_HOME_MOCK_DATA: DashboardHomeMockData = {
  brand: 'ZYNC',
  greeting: 'Xin chào, bạn! 👋',
  searchPlaceholder: 'Tìm kiếm cuộc hội thoại',
  user: {
    displayName: 'Người dùng',
    roleLabel: 'Đang hoạt động',
    initials: 'ZY',
    avatarUrl: undefined,
  },
  primaryAction: 'Tin nhắn mới',
  navItems: [
    { id: 'home', label: 'Tổng quan', icon: 'home', active: true },
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'friends', label: 'Bạn bè', icon: 'friends' },
    { id: 'community', label: 'Cộng đồng', icon: 'group' },
    { id: 'explore', label: 'Khám phá', icon: 'search' },
  ],
  sideFooterItems: [
    { id: 'settings', label: 'Cài đặt', icon: 'settings' },
    { id: 'logout', label: 'Đăng xuất', icon: 'logout' },
  ],
  stories: [
    { id: 'owner', name: 'Của bạn', initials: '+', isOwner: true, toneClass: 'bg-[#0f5845]' },
    { id: 's1', name: 'Minh Anh', initials: 'MA', toneClass: 'bg-[#c3a897]' },
    { id: 's2', name: 'Thu Hà', initials: 'TH', toneClass: 'bg-[#a08274]' },
    { id: 's3', name: 'Hoàng', initials: 'HG', toneClass: 'bg-[#d7be9f]' },
    { id: 's4', name: 'Linh Chi', initials: 'LC', toneClass: 'bg-[#7f7a68]' },
  ],
  stats: [
    { id: 'stat-1', value: '50K+', label: 'Developers', badge: 'Active', icon: 'friends' },
    { id: 'stat-2', value: '1.2K+', label: 'Cộng đồng', badge: 'Channels', icon: 'group' },
    { id: 'stat-3', value: '5M+', label: 'Code Snippets', badge: 'Shared', icon: 'message' },
  ],
  activityTitle: 'Hoạt động gần đây',
  activityCtaLabel: 'Xem tất cả',
  activities: [
    {
      id: 'a1',
      title: 'Nguyễn Tuấn',
      message: 'Vừa đăng bài viết trong cộng đồng React Vietnam',
      timeLabel: '2 phút trước',
      initials: 'NT',
      toneClass: 'bg-[#97a7b8]',
      isUnread: false,
    },
    {
      id: 'a2',
      title: 'Trần Thảo',
      message: '"Tối nay đi cafe không mọi người? ☕"',
      timeLabel: '15 phút trước',
      initials: 'TT',
      toneClass: 'bg-[#88b3c8]',
      isUnread: true,
    },
    {
      id: 'a3',
      title: 'Cộng đồng DevOps',
      message: 'Admin vừa chia sẻ bài viết mới về Kubernetes',
      timeLabel: '1 giờ trước',
      initials: 'CD',
      toneClass: 'bg-[#1a6f58]',
      icon: 'bag',
      isUnread: false,
    },
  ],
};
