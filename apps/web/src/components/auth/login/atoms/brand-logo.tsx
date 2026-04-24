import Image from 'next/image';

interface BrandLogoProps {
  brand: string;
}

export function BrandLogo({ brand }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="relative h-12 w-12 overflow-hidden rounded-2xl border border-border shadow-sm" aria-hidden>
        <Image
          src="/logo.png"
          alt=""
          fill
          sizes="48px"
          className="object-cover"
          priority
        />
      </span>
      <span className="font-ui-brand text-[46px] font-extrabold uppercase leading-none tracking-[-0.02em] text-accent-strong sm:text-[52px]">
        {brand}
      </span>
    </div>
  );
}
