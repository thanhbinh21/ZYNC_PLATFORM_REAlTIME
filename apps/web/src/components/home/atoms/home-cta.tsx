import Link from 'next/link';

interface HomeCtaProps {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

export function HomeCta({ label, href, variant }: HomeCtaProps) {
  const className =
    variant === 'primary'
      ? 'font-ui-title zync-glass-floating inline-flex h-12 items-center justify-center rounded-full border border-[#adffe1]/45 bg-gradient-to-r from-[#96ffdc] to-[#3cd8ab] px-7 text-sm font-semibold text-[#053a2c] shadow-[0_8px_26px_rgba(48,215,171,0.28)] transition hover:brightness-110'
      : 'font-ui-title zync-glass-panel inline-flex h-12 items-center justify-center rounded-full px-7 text-sm font-semibold text-[#e3fff4] transition hover:border-[#adffe1]/35 hover:bg-white/15';

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
