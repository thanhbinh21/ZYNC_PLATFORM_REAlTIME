import type { StoryAvatarProps } from '../stories.types';

const SIZE_MAP = {
  sm: { outer: 'h-12 w-12', inner: 'h-10 w-10', text: 'text-xs', ring: 'p-[2px]' },
  md: { outer: 'h-[68px] w-[68px]', inner: 'h-[60px] w-[60px]', text: 'text-sm', ring: 'p-[3px]' },
  lg: { outer: 'h-20 w-20', inner: 'h-[72px] w-[72px]', text: 'text-base', ring: 'p-[3px]' },
};

export function StoryAvatar({ initials, avatarUrl, seen, isOwner, size = 'md', onClick }: StoryAvatarProps) {
  const s = SIZE_MAP[size];

  const ringBg = seen
    ? 'bg-[#2a3d37]'
    : 'bg-gradient-to-br from-[#30d7ab] via-[#26c99f] to-[#0ea87e]';

  const glowClass = !seen ? 'shadow-[0_0_12px_rgba(48,215,171,0.3)]' : '';

  const wrapperClass = `group relative inline-flex ${s.outer} shrink-0 items-center justify-center rounded-full ${s.ring} ${ringBg} ${glowClass} transition-all duration-200 hover:scale-105 hover:shadow-[0_0_18px_rgba(48,215,171,0.4)]`;

  const inner = (
    <span
      className={`inline-flex ${s.inner} items-center justify-center overflow-hidden rounded-full bg-[#0a2a22] ${s.text} font-semibold tracking-wide text-[#e2fff5]`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={initials} className="h-full w-full object-cover" />
      ) : isOwner ? (
        <span className="text-[#30d7ab]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
      ) : (
        initials
      )}
    </span>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={isOwner ? 'Tạo story' : initials} className={wrapperClass}>
        {inner}
      </button>
    );
  }

  return <div className={wrapperClass}>{inner}</div>;
}
