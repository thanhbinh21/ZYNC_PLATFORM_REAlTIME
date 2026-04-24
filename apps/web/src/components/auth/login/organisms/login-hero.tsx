import { BrandLogo } from '../atoms/brand-logo';
import { AvatarCluster } from '../molecules/avatar-cluster';
import type { LoginScreenMockData } from '../login.types';

interface LoginHeroProps {
  data: LoginScreenMockData;
}

export function LoginHero({ data }: LoginHeroProps) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-2xl text-center lg:mx-0 lg:text-left">
      <div className="mx-auto w-fit lg:mx-0">
        <BrandLogo brand={data.brand} />
      </div>

      <h1 className="font-ui-title mx-auto mt-10 max-w-[14ch] text-balance text-[clamp(3rem,7vw,6rem)] font-semibold leading-[1.04] tracking-[-0.015em] text-text-primary lg:mx-0 lg:mt-12">
        {data.headline.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <p className="font-ui-content mx-auto mt-8 max-w-[28ch] text-balance text-[clamp(1.7rem,3.6vw,2.9rem)] leading-[1.2] text-text-secondary lg:mx-0 lg:mt-10">
        {data.subtitle}
      </p>

      <div className="mt-9 flex justify-center lg:mt-10 lg:justify-start">
        <AvatarCluster
          members={data.members}
          extraMembersLabel={data.extraMembersLabel}
          caption={data.bottomCaption}
        />
      </div>
    </section>
  );
}
