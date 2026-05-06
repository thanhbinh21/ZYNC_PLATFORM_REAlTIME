import type { LoginScreenMockData } from './login.types';

export const LOGIN_SCREEN_MOCK_DATA: LoginScreenMockData = {
  brand: 'ZYNC',
  headline: ['Kết nối cùng', 'thế giới.'],
  subtitle: 'Bước vào không gian NO VIBE NO LIFE. Trải nghiệm nhắn tin tối giản, bảo mật và giữ mạch giao tiếp liên tục.',
  members: [
    { id: '1', name: 'An', initials: 'AN', tone: 'bg-accent-light text-accent-strong' },
    { id: '2', name: 'Binh', initials: 'BI', tone: 'bg-bg-hover text-text-primary' },
    { id: '3', name: 'Chi', initials: 'CH', tone: 'bg-accent-light text-accent-strong' },
  ],
  extraMembersLabel: '+2k',
  bottomCaption: 'Tham gia cùng hàng nghìn người dùng đang hoạt động mỗi ngày.',
  cardTitle: 'Chào mừng đến với ZYNC',
  cardSubtitle: 'Đăng nhập hoặc tạo tài khoản mới để bắt đầu trải nghiệm.',
  loginTabLabel: 'Đăng nhập',
  registerTabLabel: 'Đăng ký',
  socialTitle: 'Hoặc tiếp tục với',
  registerHint: 'Bạn chưa có tài khoản?',
  loginHint: 'Bạn đã có tài khoản?',
  loginHintAction: 'Đăng nhập ngay',
  registerHintAction: 'Bắt đầu',
  footer: {
    copyright: '© 2024 ZYNC Messaging. Nền tảng nhắn tin thời gian thực.',
    links: ['Chính sách bảo mật', 'Điều khoản dịch vụ', 'Liên hệ'],
    statusLabel: 'Hệ thống ổn định',
  },
};
