import type { DashboardStoryItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardStoryItemProps {
  item: DashboardStoryItem;
  onClick?: (item: DashboardStoryItem) => void;
}

export function DashboardStoryItemRow({ item, onClick }: DashboardStoryItemProps) {
  return (
    <button type="button" onClick={() => onClick?.(item)} className="group flex min-w-[68px] flex-col items-center gap-2 text-center">
      <span className="relative inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-accent bg-bg-hover text-sm font-semibold text-text-primary">
        <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${item.toneClass}`}>
          {item.isOwner ? <DashboardIcon name="plus" className="h-4 w-4" /> : item.initials}
        </span>
      </span>
      <span className="font-ui-meta text-[0.66rem] uppercase tracking-wider text-text-secondary transition group-hover:text-text-primary">
        {item.name}
      </span>
    </button>
  );
}
