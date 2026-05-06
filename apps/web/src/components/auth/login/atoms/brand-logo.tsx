import Image from 'next/image';

interface BrandLogoProps {
  brand: string;
  variant?: 'default' | 'large';
}

export function BrandLogo({ brand, variant = 'default' }: BrandLogoProps) {
  const isLarge = variant === 'large';

  return (
    <div className={`flex items-center gap-3 ${isLarge ? 'gap-4' : 'gap-3'}`}>
      <span
        className={`relative overflow-hidden rounded-2xl border border-border shadow-sm ${
          isLarge ? 'h-14 w-14' : 'h-12 w-12'
        }`}
        aria-hidden
      >
        <Image
          src="/logo.png"
          alt=""
          fill
          sizes={isLarge ? '56px' : '48px'}
          className="object-cover"
          priority
        />
      </span>
      <span
        className={`font-ui-brand font-extrabold uppercase leading-none tracking-[-0.02em] text-accent-strong ${
          isLarge ? 'text-4xl sm:text-5xl' : 'text-[46px] sm:text-[52px]'
        }`}
      >
        {brand}
      </span>
    </div>
  );
}
