export type DashboardIconName =
  | 'home'
  | 'chat'
  | 'profile'
  | 'message'
  | 'friends'
  | 'group'
  | 'settings'
  | 'logout'
  | 'plus'
  | 'edit'
  | 'search'
  | 'bell'
  | 'gear'
  | 'bag';

export interface DashboardUserSummary {
  displayName: string;
  roleLabel: string;
  initials: string;
  avatarUrl?: string;
}

export interface DashboardNavItem {
  id: string;
  label: string;
  icon: DashboardIconName;
  active?: boolean;
}

export interface DashboardStoryItem {
  id: string;
  name: string;
  initials: string;
  isOwner?: boolean;
  toneClass: string;
}

export interface DashboardStatItem {
  id: string;
  value: string;
  label: string;
  badge: string;
  icon: DashboardIconName;
}

export interface DashboardActivityItem {
  id: string;
  title: string;
  message: string;
  timeLabel: string;
  initials: string;
  toneClass: string;
  isUnread?: boolean;
  icon?: DashboardIconName;
}

export interface DashboardHomeMockData {
  brand: string;
  greeting: string;
  searchPlaceholder: string;
  user: DashboardUserSummary;
  primaryAction: string;
  navItems: DashboardNavItem[];
  sideFooterItems: DashboardNavItem[];
  stories: DashboardStoryItem[];
  stats: DashboardStatItem[];
  activityTitle: string;
  activityCtaLabel: string;
  activities: DashboardActivityItem[];
}

