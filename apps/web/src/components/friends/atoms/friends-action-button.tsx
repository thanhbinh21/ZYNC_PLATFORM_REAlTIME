interface FriendsActionButtonProps {
  label: string;
  variant?: 'primary' | 'danger' | 'neutral';
  onClick: () => void;
  disabled?: boolean;
}

export function FriendsActionButton({
  label,
  variant = 'neutral',
  onClick,
  disabled,
}: FriendsActionButtonProps) {
  const classes =
    variant === 'primary'
      ? 'bg-[#35d4a7] text-[#063428] hover:brightness-110'
      : variant === 'danger'
        ? 'bg-[#4e2130] text-[#ffd4dc] hover:bg-[#633042]'
        : 'bg-[#0f4d3d] text-[#c8ece1] hover:bg-[#145d4a]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`font-ui-title h-9 rounded-lg px-3 text-xs font-semibold transition ${classes} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {label}
    </button>
  );
}
