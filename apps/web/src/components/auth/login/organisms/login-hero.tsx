import { BrandLogo } from '../atoms/brand-logo';
import { AvatarCluster } from '../molecules/avatar-cluster';
import type { LoginScreenMockData } from '../login.types';

interface LoginHeroProps {
  data: LoginScreenMockData;
}

export function LoginHero({ data }: LoginHeroProps) {
  return (
    <section className="relative z-10 max-w-2xl">
      <BrandLogo brand={data.brand} />

      <h1 className="font-ui-title mt-12 max-w-[14ch] text-balance text-[clamp(3.2rem,7vw,6.3rem)] font-semibold leading-[1.02] tracking-[-0.015em] text-[#d8eee6]">
        {data.headline.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <p className="font-ui-content mt-10 max-w-[28ch] text-balance text-[clamp(1.85rem,3.6vw,3.2rem)] leading-[1.12] text-[#89b1a4]">
        {data.subtitle}
      </p>

      <div className="mt-10">
        <AvatarCluster
          members={data.members}
          extraMembersLabel={data.extraMembersLabel}
          caption={data.bottomCaption}
        />
      </div>
    </section>
  );
}
