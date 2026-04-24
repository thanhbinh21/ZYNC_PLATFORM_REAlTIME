import Link from 'next/link';

interface HomeCtaProps {
  label: string;
  href: string;
  variant: 'primary' | 'secondary';
}

export function HomeCta({ label, href, variant }: HomeCtaProps) {
  const className =
    variant === 'primary'
      ? 'zync-soft-button min-w-[11rem]'
      : 'zync-soft-button-secondary min-w-[11rem]';

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
