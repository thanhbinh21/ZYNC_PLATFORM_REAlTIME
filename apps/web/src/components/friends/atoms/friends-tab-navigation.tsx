import { Users, Mail, Search } from 'lucide-react';

interface FriendsTabNavigationProps {
  activeTab: 'all' | 'requests' | 'search';
  onTabChange: (tab: 'all' | 'requests' | 'search') => void;
  pendingCount: number;
}

export function FriendsTabNavigation({ activeTab, onTabChange, pendingCount }: FriendsTabNavigationProps) {
  const tabs = [
    { id: 'all' as const, label: 'Tất cả bạn bè', Icon: Users },
    { id: 'requests' as const, label: 'Lời mời', Icon: Mail },
    { id: 'search' as const, label: 'Tìm kiếm', Icon: Search },
  ];

  return (
    <nav className="flex items-center gap-1 rounded-2xl border border-border bg-[var(--surface-muted)] p-1.5">
      {tabs.map((tab) => {
        const Icon = tab.Icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold
              transition-all duration-200 ease-out
              ${
                isActive
                  ? 'bg-[var(--accent)] text-white shadow-[0_4px_12px_rgba(15,157,142,0.3)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
              }
            `}
          >
            <Icon className="h-4 w-4" />
            <span>{tab.label}</span>
            {tab.id === 'requests' && pendingCount > 0 && (
              <span
                className={`
                  ml-1 flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold
                  ${isActive ? 'bg-white/25 text-white' : 'bg-[var(--accent)] text-white'}
                `}
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
