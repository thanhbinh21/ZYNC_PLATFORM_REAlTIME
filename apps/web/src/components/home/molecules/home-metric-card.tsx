import type { HomeMetricItem } from '../home.types';

interface HomeMetricCardProps {
  item: HomeMetricItem;
}

export function HomeMetricCard({ item }: HomeMetricCardProps) {
  return (
    <article className="zync-reveal-up zync-glass-panel rounded-2xl p-5">
      <p className="font-ui-title text-3xl text-[#f2fff9]">{item.value}</p>
      <p className="font-ui-title mt-2 text-base text-[#d7f3e8]">{item.label}</p>
      <p className="font-ui-content mt-1 text-sm leading-6 text-[#cae8dc]">{item.description}</p>
    </article>
  );
}
