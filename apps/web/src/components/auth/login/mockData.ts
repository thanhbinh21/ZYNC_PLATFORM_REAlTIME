import type { LoginScreenMockData } from './login.types';

export const LOGIN_SCREEN_MOCK_DATA: LoginScreenMockData = {
  brand: 'ZYNC',
  headline: ['Kết nối cùng', 'thế giới.'],
  subtitle: 'Bước vào không gian NO VIBE NO LIFE. Trải nghiệm nhắn tin tối giản, bảo mật và giữ mạch giao tiếp liên tục.',
  members: [
    { id: '1', name: 'An', initials: 'AN', tone: 'bg-[#d7b498]' },
    { id: '2', name: 'Binh', initials: 'BI', tone: 'bg-[#9eb8d4]' },
    { id: '3', name: 'Chi', initials: 'CH', tone: 'bg-[#8ca67f]' },
  ],
  extraMembersLabel: '+2k',
  bottomCaption: 'Tham gia cùng hàng nghìn người dùng đang hoạt động mỗi ngày.',
  cardTitle: 'Welcom to ZYNC',
  cardSubtitle: 'Đăng nhập hoặc tạo tài khoản với mã OTP bảo mật.',
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
