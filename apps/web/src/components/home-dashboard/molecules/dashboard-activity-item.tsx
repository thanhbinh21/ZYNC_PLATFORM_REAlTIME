import type { DashboardActivityItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardActivityItemProps {
  item: DashboardActivityItem;
  onClick?: (item: DashboardActivityItem) => void;
}

export function DashboardActivityItemRow({ item, onClick }: DashboardActivityItemProps) {
  return (
    <article
      className="grid cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[1.2rem] border border-transparent px-3 py-3 transition hover:border-border hover:bg-white/65"
      onClick={() => onClick?.(item)}
    >
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.toneClass} text-sm font-semibold text-white shadow-sm`}>
        {item.icon ? <DashboardIcon name={item.icon} className="h-4 w-4" /> : item.initials}
      </span>

      <div>
        <p className="font-ui-title text-sm text-text-primary">{item.title}</p>
        <p className="font-ui-content text-sm text-text-secondary">{item.message}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-ui-meta text-xs text-accent">{item.timeLabel}</span>
        {item.isUnread ? <span className="h-2 w-2 rounded-full bg-accent" /> : null}
      </div>
    </article>
  );
}
