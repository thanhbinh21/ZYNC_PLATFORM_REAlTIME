import type { DashboardNavItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardNavItemProps {
  item: DashboardNavItem;
}

export function DashboardNavItemRow({ item }: DashboardNavItemProps) {
  return (
    <button
      type="button"
      className={`group flex h-10 w-full items-center gap-3 rounded-r-xl border-l-2 px-4 text-left transition ${
        item.active
          ? 'border-l-[#2be4b0] bg-[#0d3e31] text-[#b9ffe8]'
          : 'border-l-transparent text-[#86a99e] hover:bg-[#0f3a30] hover:text-[#d0ffef]'
      }`}
    >
      <span className={`${item.active ? 'text-[#4ff0c3]' : 'text-[#84a79c] group-hover:text-[#bff9e7]'}`}>
        <DashboardIcon name={item.icon} className="h-[15px] w-[15px]" />
      </span>
      <span className="font-ui-content text-[0.98rem]">{item.label}</span>
    </button>
  );
}
