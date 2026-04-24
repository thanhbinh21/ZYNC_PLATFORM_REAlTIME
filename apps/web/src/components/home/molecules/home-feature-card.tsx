import type { HomeFeatureItem } from '../home.types';

interface HomeFeatureCardProps {
  item: HomeFeatureItem;
}

function FeatureIcon({ icon }: { icon: HomeFeatureItem['icon'] }) {
  if (icon === 'shield') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path d="M12 3 5 6v6c0 5 3.4 8.2 7 9 3.6-.8 7-4 7-9V6l-7-3Z" className="stroke-accent" strokeWidth="1.6" />
        <path d="m9.2 12 1.8 1.8 3.8-3.8" className="stroke-accent" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (icon === 'bolt') {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
        <path d="M13 2 6 13h5l-1 9 8-12h-5l1-8Z" className="stroke-accent" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
      <rect x="3" y="4" width="10" height="15" rx="2" className="stroke-accent" strokeWidth="1.6" />
      <rect x="15" y="7" width="6" height="11" rx="1.5" className="stroke-accent" strokeWidth="1.6" />
      <path d="M8 16h1" className="stroke-accent" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HomeFeatureCard({ item }: HomeFeatureCardProps) {
  return (
    <article className="zync-reveal-up zync-soft-card zync-soft-card-elevated rounded-[1.9rem] p-6">
      <div className="zync-soft-card-muted flex h-12 w-12 items-center justify-center rounded-[1.1rem]">
        <FeatureIcon icon={item.icon} />
      </div>
      <h3 className="font-ui-title mt-5 text-xl leading-tight text-text-primary">{item.title}</h3>
      <p className="font-ui-content mt-2 text-base leading-7 text-text-secondary">{item.description}</p>
    </article>
  );
}
