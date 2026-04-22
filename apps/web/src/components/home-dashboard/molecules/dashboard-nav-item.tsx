import type { DashboardNavItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardNavItemProps {
  item: DashboardNavItem;
  isActive?: boolean;
  onClick?: (item: DashboardNavItem) => void;
}

export function DashboardNavItemRow({ item, isActive = false, onClick }: DashboardNavItemProps) {
  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className={`group flex h-10 w-full items-center gap-3 rounded-r-xl border-l-2 px-4 text-left transition ${
        isActive
          ? 'border-l-accent bg-bg-active text-text-primary'
          : 'border-l-transparent text-text-secondary hover:bg-bg-hover hover:text-text-primary'
      }`}
    >
      <span className={`${isActive ? 'text-accent' : 'text-text-tertiary group-hover:text-accent-hover'}`}>
        <DashboardIcon name={item.icon} className="h-[15px] w-[15px]" />
      </span>
      <span className="font-ui-content text-[0.98rem]">{item.label}</span>
    </button>
  );
}
