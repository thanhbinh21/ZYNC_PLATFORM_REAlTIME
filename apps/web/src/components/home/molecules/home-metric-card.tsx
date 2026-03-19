import type { HomeMetricItem } from '../home.types';

interface HomeMetricCardProps {
  item: HomeMetricItem;
}

export function HomeMetricCard({ item }: HomeMetricCardProps) {
  return (
    <article className="rounded-2xl border border-white/15 bg-white/8 p-5 backdrop-blur-xl">
      <p className="font-ui-title text-3xl text-[#f2fff9]">{item.value}</p>
      <p className="font-ui-title mt-2 text-base text-[#d7f3e8]">{item.label}</p>
      <p className="font-ui-content mt-1 text-sm leading-6 text-[#abd5c5]">{item.description}</p>
    </article>
  );
}
