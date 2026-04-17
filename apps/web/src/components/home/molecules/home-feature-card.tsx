import type { HomeFeatureItem } from '../home.types';

interface HomeFeatureCardProps {
  item: HomeFeatureItem;
}

function FeatureIcon({ icon }: { icon: HomeFeatureItem['icon'] }) {
  if (icon === 'shield') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path d="M12 3 5 6v6c0 5 3.4 8.2 7 9 3.6-.8 7-4 7-9V6l-7-3Z" className="stroke-[#77ffd0]" strokeWidth="1.6" />
        <path d="m9.2 12 1.8 1.8 3.8-3.8" className="stroke-[#77ffd0]" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === 'bolt') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path d="M13 2 6 13h5l-1 9 8-12h-5l1-8Z" className="stroke-[#77ffd0]" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <rect x="3" y="4" width="10" height="15" rx="2" className="stroke-[#77ffd0]" strokeWidth="1.6" />
      <rect x="15" y="7" width="6" height="11" rx="1.5" className="stroke-[#77ffd0]" strokeWidth="1.6" />
      <path d="M8 16h1" className="stroke-[#77ffd0]" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HomeFeatureCard({ item }: HomeFeatureCardProps) {
  return (
    <article className="zync-reveal-up zync-glass-panel zync-glass-floating rounded-3xl p-5">
      <div className="zync-glass-subtle flex h-11 w-11 items-center justify-center rounded-2xl border-[#8dffd9]/35 bg-[#0f4d3f]/58">
        <FeatureIcon icon={item.icon} />
      </div>
      <h3 className="font-ui-title mt-4 text-xl leading-tight text-[#e9fff7]">{item.title}</h3>
      <p className="font-ui-content mt-2 text-base leading-7 text-[#d0efe2]">{item.description}</p>
    </article>
  );
}
