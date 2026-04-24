import type { HomeMockData } from './home.types';

export const HOME_MOCK_DATA: HomeMockData = {
  brand: 'ZYNC',
  releaseLabel: 'NEW RELEASE V2.0',
  title: 'ZYNC – Nơi Developer kết nối',
  titleAccent: 'cộng đồng',
  subtitle:
    'Chia sẻ kiến thức, review code, và xây dựng cộng đồng cùng AI DevMentor hỗ trợ 24/7',
  ctaPrimary: 'Tham gia miễn phí',
  ctaSecondary: 'Khám phá cộng đồng',
  navItems: [
    { id: 'nav-features', label: 'Tính năng', href: '#features' },
    { id: 'nav-security', label: 'Cộng đồng', href: '#security' },
    { id: 'nav-platforms', label: 'Nền tảng', href: '#platforms' },
    { id: 'nav-pricing', label: 'Developer API', href: '#pricing' },
  ],
  navAuthLabel: 'Đăng nhập',
  navPrimaryLabel: 'Tham gia miễn phí',
  features: [
    {
      id: 'f1',
      icon: 'shield',
      title: 'Chat real-time',
      description: 'Giao tiếp nhanh chóng, đồng bộ lập tức với cộng đồng và bạn bè. Tốc độ vượt trội.',
    },
    {
      id: 'f2',
      icon: 'bolt',
      title: 'Community Posts',
      description: 'Chia sẻ kiến thức, bài viết chất lượng cao và thảo luận sôi nổi cùng các developer khác.',
    },
    {
      id: 'f3',
      icon: 'devices',
      title: 'Code Sharing & AI Mentor',
      description: 'Chia sẻ code snippets chuyên nghiệp, nhận review và hỗ trợ trực tiếp từ AI DevMentor 24/7.',
    },
  ],
  globalTitle: 'Nền tảng kết nối cộng đồng Developer',
  globalSubtitle: 'Nơi quy tụ các lập trình viên hàng đầu để giao lưu, học hỏi và phát triển sự nghiệp.',
  metrics: [
    {
      id: 'm1',
      value: '50K+',
      label: 'Developers',
      description: 'Lập trình viên đang hoạt động',
    },
    {
      id: 'm2',
      value: '1.2K+',
      label: 'Communities',
      description: 'Cộng đồng chuyên môn',
    },
    {
      id: 'm3',
      value: '5M+',
      label: 'Code Snippets',
      description: 'Được chia sẻ & review',
    },
  ],
  ctaBlockTitle: 'Sẵn sàng gia nhập cộng đồng Developer lớn nhất?',
  ctaBlockSubtitle: 'Khởi đầu hành trình mới, kết nối với hàng ngàn lập trình viên và nâng tầm kỹ năng của bạn cùng ZYNC.',
  ctaBlockButton: 'Tham gia miễn phí ngay',
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
