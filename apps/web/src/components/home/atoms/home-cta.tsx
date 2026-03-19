import Link from 'next/link';

interface HomeCtaProps {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

export function HomeCta({ label, href, variant }: HomeCtaProps) {
  const className =
    variant === 'primary'
      ? 'font-ui-title inline-flex h-12 items-center justify-center rounded-full bg-[#4ed9aa] px-7 text-sm font-semibold text-[#073d2f] transition hover:brightness-110'
      : 'font-ui-title inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 text-sm font-semibold text-[#d1f4e7] transition hover:bg-white/12';

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
