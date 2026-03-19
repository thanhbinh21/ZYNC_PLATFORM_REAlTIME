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
    <span className="font-ui-title inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#0f5a46] text-sm text-[#d8f5eb]">
      {initials || 'U'}
    </span>
  );
}
