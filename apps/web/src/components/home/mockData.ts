import type { HomeMockData } from './home.types';

export const HOME_MOCK_DATA: HomeMockData = {
  brand: 'ZYNC',
  releaseLabel: 'NEW RELEASE V2.0',
  title: 'Kết nối tương lai',
  titleAccent: 'xanh',
  subtitle:
    'Trải nghiệm nhắn tin thời gian thực với phong cách glassmorphism hiện đại. Bảo mật, tốc độ và tinh tế trong từng điểm chạm.',
  ctaPrimary: 'Bắt đầu ngay',
  ctaSecondary: 'Tìm hiểu thêm',
  navItems: [
    { id: 'nav-features', label: 'Tính năng', href: '#features' },
    { id: 'nav-security', label: 'Bảo mật', href: '#security' },
    { id: 'nav-platforms', label: 'Nền tảng', href: '#platforms' },
    { id: 'nav-pricing', label: 'Gói dịch vụ', href: '#pricing' },
  ],
  navAuthLabel: 'Đăng nhập',
  navPrimaryLabel: 'Bắt đầu',
  features: [
    {
      id: 'f1',
      icon: 'shield',
      title: 'Bảo mật tuyệt đối',
      description: 'Mã hóa đầu cuối chuẩn quân đội, đảm bảo mọi cuộc trò chuyện của bạn luôn riêng tư và an toàn.',
    },
    {
      id: 'f2',
      icon: 'bolt',
      title: 'Tốc độ vượt trội',
      description: 'Hạ tầng máy chủ toàn cầu tối ưu hóa độ trễ, gửi nhận tin nhắn và tệp tin lớn trong tích tắc.',
    },
    {
      id: 'f3',
      icon: 'devices',
      title: 'Đa nền tảng',
      description: 'Đồng bộ hóa liền mạch trên tất cả thiết bị từ smartphone, tablet đến máy tính bàn.',
    },
  ],
  globalTitle: 'Mạng lưới kết nối toàn cầu',
  globalSubtitle: 'Hơn 50 triệu người dùng tin tưởng ZYNC mỗi ngày để duy trì liên lạc và làm việc hiệu quả.',
  metrics: [
    {
      id: 'm1',
      value: '99.9%',
      label: 'Uptime cam kết',
      description: 'Luôn sẵn sàng khi bạn cần nhất',
    },
    {
      id: 'm2',
      value: '256-bit',
      label: 'Mã hóa',
      description: 'Mã hóa dữ liệu chuẩn cao cấp',
    },
    {
      id: 'm3',
      value: '0.1s',
      label: 'Latency',
      description: 'Phản hồi gần như tức thì',
    },
  ],
  ctaBlockTitle: 'Sẵn sàng để thay đổi cách bạn giao tiếp?',
  ctaBlockSubtitle: 'Gia nhập cộng đồng ZYNC ngay hôm nay và trải nghiệm sự khác biệt từ tốc độ và bảo mật.',
  ctaBlockButton: 'Tạo tài khoản miễn phí',
  footerBrand: 'ZYNC ARCHIVE',
  footerCopyright: '© 2024 ZYNC Archive. Bảo lưu mọi quyền.',
  footerLinks: [
    { id: 'f-policy', label: 'Chính sách bảo mật', href: '#' },
    { id: 'f-terms', label: 'Điều khoản dịch vụ', href: '#' },
    { id: 'f-cookie', label: 'Chính sách cookie', href: '#' },
    { id: 'f-support', label: 'Hỗ trợ', href: '#' },
    { id: 'f-contact', label: 'Liên hệ', href: '#' },
  ],
};
