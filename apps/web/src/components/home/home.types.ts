export interface HomeFeatureItem {
  id: string;
  icon: 'shield' | 'bolt' | 'devices';
  title: string;
  description: string;
}

export interface HomeMetricItem {
  id: string;
  value: string;
  label: string;
  description: string;
}

export interface HomeNavItem {
  id: string;
  label: string;
  href: string;
}

export interface HomeFooterLink {
  id: string;
  label: string;
  href: string;
}

export interface HomeMockData {
  brand: string;
  releaseLabel: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  navItems: HomeNavItem[];
  navAuthLabel: string;
  navPrimaryLabel: string;
  features: HomeFeatureItem[];
  globalTitle: string;
  globalSubtitle: string;
  metrics: HomeMetricItem[];
  ctaBlockTitle: string;
  ctaBlockSubtitle: string;
  ctaBlockButton: string;
  footerBrand: string;
  footerCopyright: string;
  footerLinks: HomeFooterLink[];
}

export interface HomeScreenProps {
  data: HomeMockData;
}
