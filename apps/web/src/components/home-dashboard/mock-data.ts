import type { DashboardHomeMockData } from './home-dashboard.types';

export const DASHBOARD_HOME_MOCK_DATA: DashboardHomeMockData = {
  brand: 'ZYNC',
  greeting: 'Chào buổi sáng, Nam!',
  searchPlaceholder: 'Tìm kiếm cuộc hội thoại',
  user: {
    displayName: 'Trung tâm điều khiển',
    roleLabel: 'Trực tuyến',
    initials: 'NM',
  },
  primaryAction: 'Tin nhắn mới',
  navItems: [
    { id: 'home', label: 'Trang chủ', icon: 'home', active: true },
    { id: 'chat', label: 'Chat', icon: 'chat' },
    { id: 'profile', label: 'Cá nhân', icon: 'profile' },
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
    { id: 'stat-1', value: '42', label: 'Số tin nhắn mới', badge: '+12', icon: 'message' },
    { id: 'stat-2', value: '08', label: 'Lời mời kết bạn', badge: '5', icon: 'friends' },
    { id: 'stat-3', value: '15', label: 'Nhóm đang hoạt động', badge: '', icon: 'group' },
  ],
  activityTitle: 'Hoạt động gần đây',
  activityCtaLabel: 'Xem tất cả',
  activities: [
    {
      id: 'a1',
      title: 'Nguyễn Tuấn',
      message: 'Vừa gửi một hình ảnh trong nhóm "Dự án Zync"',
      timeLabel: '2 phút trước',
      initials: 'NT',
      toneClass: 'bg-[#97a7b8]',
      isUnread: false,
    },
    {
      id: 'a2',
      title: 'Trần Thảo',
      message: '"Tối nay đi cafe không mọi người?"',
      timeLabel: '15 phút trước',
      initials: 'TT',
      toneClass: 'bg-[#88b3c8]',
      isUnread: true,
    },
    {
      id: 'a3',
      title: 'Cộng đồng Design',
      message: 'Admin vừa cập nhật quy định của nhóm',
      timeLabel: '1 giờ trước',
      initials: 'CD',
      toneClass: 'bg-[#1a6f58]',
      icon: 'bag',
      isUnread: false,
    },
  ],
};
