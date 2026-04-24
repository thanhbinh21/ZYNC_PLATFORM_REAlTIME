interface FriendsAvatarProps {
  name: string;
}

export function FriendsAvatar({ name }: FriendsAvatarProps) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span className="font-ui-title inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-accent-light text-sm text-accent-strong shadow-sm">
      {initials || 'U'}
    </span>
  );
}
