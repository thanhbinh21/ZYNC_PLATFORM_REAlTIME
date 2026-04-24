import type { DashboardStatItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardStatCardProps {
  item: DashboardStatItem;
}

export function DashboardStatCard({ item }: DashboardStatCardProps) {
  return (
    <article className="zync-soft-card rounded-[1.6rem] p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent-strong">
          <DashboardIcon name={item.icon} className="h-4 w-4" />
        </span>
        {item.badge ? <span className="font-ui-title text-xl text-accent-strong">{item.badge}</span> : null}
      </div>
      <p className="font-ui-title mt-7 text-[2.25rem] leading-none text-text-primary">{item.value}</p>
      <p className="font-ui-content mt-2 text-[1rem] text-text-secondary">{item.label}</p>
    </article>
  );
}
