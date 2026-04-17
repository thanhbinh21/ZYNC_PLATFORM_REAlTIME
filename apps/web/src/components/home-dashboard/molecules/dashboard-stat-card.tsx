import type { DashboardStatItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardStatCardProps {
  item: DashboardStatItem;
}

export function DashboardStatCard({ item }: DashboardStatCardProps) {
  return (
    <article className="zync-glass-panel zync-glass-floating rounded-3xl p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="zync-glass-subtle inline-flex h-10 w-10 items-center justify-center rounded-xl border-[#8dffd9]/25 bg-[#133f33]/58 text-[#8dffd9]">
          <DashboardIcon name={item.icon} className="h-4 w-4" />
        </span>
        {item.badge ? <span className="font-ui-title text-xl text-[#9fffe0]">{item.badge}</span> : null}
      </div>
      <p className="font-ui-title mt-7 text-[2.25rem] leading-none text-[#d9f6ed]">{item.value}</p>
      <p className="font-ui-content mt-2 text-[1rem] text-[#d1ece2]">{item.label}</p>
    </article>
  );
}
