import type { StoryAvatarProps } from '../stories.types';

const SIZE_MAP = {
  sm: { outer: 'h-12 w-12', inner: 'h-10 w-10', text: 'text-xs' },
  md: { outer: 'h-16 w-16', inner: 'h-[54px] w-[54px]', text: 'text-sm' },
  lg: { outer: 'h-20 w-20', inner: 'h-[68px] w-[68px]', text: 'text-base' },
};

export function StoryAvatar({ initials, avatarUrl, seen, isOwner, size = 'md', onClick }: StoryAvatarProps) {
  const s = SIZE_MAP[size];
  const ringColor = seen
    ? 'bg-[#3a4f48]'
    : 'bg-gradient-to-tr from-[#30d7ab] via-[#1abc9c] to-[#0ea87e]';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative inline-flex ${s.outer} shrink-0 items-center justify-center rounded-full p-[2.5px] ${ringColor} transition hover:brightness-110`}
    >
      <span
        className={`inline-flex ${s.inner} items-center justify-center overflow-hidden rounded-full bg-[#0b3228] ${s.text} font-semibold text-[#e2fff5]`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={initials} className="h-full w-full object-cover" />
        ) : isOwner ? (
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-[#30d7ab]">
            <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
          </svg>
        ) : (
          initials
        )}
      </span>
    </button>
  );
}
