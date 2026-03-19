import { BrandLogo } from '../atoms/brand-logo';
import { AvatarCluster } from '../molecules/avatar-cluster';
import type { LoginScreenMockData } from '../login.types';

interface LoginHeroProps {
  data: LoginScreenMockData;
}

export function LoginHero({ data }: LoginHeroProps) {
  return (
    <section className="relative z-10 max-w-xl">
      <BrandLogo brand={data.brand} />

      <h1 className="mt-12 text-[62px] font-semibold leading-[0.94] tracking-[-0.03em] text-[#d8eee6] sm:text-[74px]">
        {data.headline.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </h1>

      <p className="mt-10 max-w-lg text-[33px] leading-8 text-[#8cb3a6] sm:text-[34px]">
        {data.subtitle.map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
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
