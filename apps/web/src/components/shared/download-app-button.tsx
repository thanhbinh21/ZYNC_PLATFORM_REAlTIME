import { Smartphone } from 'lucide-react';

type DownloadAppButtonVariant = 'primary' | 'secondary' | 'ghost';

interface DownloadAppButtonProps {
  variant?: DownloadAppButtonVariant;
  className?: string;
}

const variantClasses: Record<DownloadAppButtonVariant, string> = {
  primary: 'zync-soft-button',
  secondary: 'zync-soft-button-secondary',
  ghost: 'zync-soft-button-ghost',
};

export function DownloadAppButton({
  variant = 'primary',
  className = '',
}: DownloadAppButtonProps) {
  const classes = [
    variantClasses[variant],
    'min-h-11 px-5 py-2.5 text-sm',
    className,
  ].filter(Boolean).join(' ');

  return (
    <a href="/downloads/zync.apk" download className={classes}>
      <Smartphone className="h-4 w-4" aria-hidden />
      <span>Tải app Android</span>
    </a>
  );
}
