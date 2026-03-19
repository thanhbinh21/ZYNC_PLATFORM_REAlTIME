import type { DashboardStatItem } from '../home-dashboard.types';
import { DashboardIcon } from '../atoms/dashboard-icon';

interface DashboardStatCardProps {
  item: DashboardStatItem;
}

export function DashboardStatCard({ item }: DashboardStatCardProps) {
  return (
    <article className="rounded-3xl border border-[#123f33] bg-[linear-gradient(120deg,#0d332a,#0b2922)] p-5 shadow-[0_10px_35px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#133f33] text-[#4de6b9]">
          <DashboardIcon name={item.icon} className="h-4 w-4" />
        </span>
        {item.badge ? <span className="font-ui-title text-xl text-[#67ffcd]">{item.badge}</span> : null}
      </div>
      <p className="font-ui-title mt-7 text-[2.25rem] leading-none text-[#d9f6ed]">{item.value}</p>
      <p className="font-ui-content mt-2 text-[1rem] text-[#a0c8bb]">{item.label}</p>
    </article>
  );
}
