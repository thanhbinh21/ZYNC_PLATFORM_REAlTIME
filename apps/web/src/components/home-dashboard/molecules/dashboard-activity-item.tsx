import type { DashboardActivityItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardActivityItemProps {
  item: DashboardActivityItem;
}

export function DashboardActivityItemRow({ item }: DashboardActivityItemProps) {
  return (
    <article className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl px-3 py-3 transition hover:bg-[#072f26]">
      <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${item.toneClass} text-sm font-semibold text-[#e7fff6]`}>
        {item.icon ? <DashboardIcon name={item.icon} className="h-4 w-4" /> : item.initials}
      </span>

      <div>
        <p className="font-ui-title text-[1.04rem] text-[#d6f4ea]">{item.title}</p>
        <p className="font-ui-content text-[0.98rem] text-[#95bdaf]">{item.message}</p>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-ui-meta text-[0.72rem] uppercase tracking-[0.08em] text-[#9ec6b8]">{item.timeLabel}</span>
        {item.isUnread ? <span className="h-2 w-2 rounded-full bg-[#31e8bb]" /> : null}
      </div>
    </article>
  );
}
