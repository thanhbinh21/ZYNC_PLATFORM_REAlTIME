import { BrandLogo } from '../atoms/brand-logo';
import { AvatarCluster } from '../molecules/avatar-cluster';
import type { LoginScreenMockData } from '../login.types';

interface LoginHeroProps {
  data: LoginScreenMockData;
}

export function LoginHero({ data }: LoginHeroProps) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-xl text-center lg:mx-0 lg:text-left">
      <BrandLogo brand={data.brand} variant="large" />

      <h1 className="font-ui-title mt-8 text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.1] tracking-tight text-text-primary lg:mt-10">
        {data.headline.map((line, index) => (
          <span
            key={line}
            className={`block ${index === data.headline.length - 1 ? 'text-accent' : ''}`}
          >
            {line}
          </span>
        ))}
      </h1>

      <p className="font-ui-content mt-6 max-w-[42ch] text-[1.05rem] leading-relaxed text-text-secondary lg:mt-7">
        {data.subtitle}
      </p>

      <div className="mt-10 flex justify-center lg:mt-9 lg:justify-start">
        <AvatarCluster
          members={data.members}
          extraMembersLabel={data.extraMembersLabel}
          caption={data.bottomCaption}
        />
      </div>

      <div className="mt-12 hidden items-center gap-8 lg:flex">
        <FeatureItem icon="message" text="Nhắn tin bảo mật" />
        <FeatureItem icon="users" text="Kết nối cộng đồng" />
        <FeatureItem icon="bolt" text="Phản hồi tức thì" />
      </div>
    </section>
  );
}

function FeatureItem({ icon, text }: { icon: 'message' | 'users' | 'bolt'; text: string }) {
  const icons = {
    message: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    users: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    bolt: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-3 text-text-tertiary">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-light text-accent">
        {icons[icon]}
      </span>
      <span className="font-ui-content text-sm font-medium">{text}</span>
    </div>
  );
}
