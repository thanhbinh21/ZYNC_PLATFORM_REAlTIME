import Image from 'next/image';

interface BrandLogoProps {
  brand: string;
}

export function BrandLogo({ brand }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-4">
      <span className="relative h-12 w-12 overflow-hidden rounded-2xl border border-[#2a7f68]/80 shadow-[0_12px_30px_rgba(0,0,0,0.35)]" aria-hidden>
        <Image
          src="/logo.png"
          alt=""
          fill
          sizes="48px"
          className="object-cover contrast-110 saturate-110"
          priority
        />
      </span>
      <span className="font-ui-brand text-[46px] font-extrabold uppercase leading-none tracking-[-0.02em] text-[#3fe2b0] sm:text-[52px]">
        {brand}
      </span>
    </div>
  );
}
