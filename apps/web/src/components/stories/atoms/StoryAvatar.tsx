import type { StoryAvatarProps } from '../stories.types';

const SIZE = {
  sm: { wrap: 'h-12 w-12 p-[2px]', inner: 'h-[44px] w-[44px] text-[0.65rem]' },
  md: { wrap: 'h-[72px] w-[72px] p-[3px]', inner: 'h-[64px] w-[64px] text-sm' },
  lg: { wrap: 'h-20 w-20 p-[3px]', inner: 'h-[72px] w-[72px] text-base' },
};

export function StoryAvatar({ initials, avatarUrl, seen, isOwner, size = 'md', onClick }: StoryAvatarProps) {
  const s = SIZE[size];

  const ringClass = seen
    ? 'bg-gradient-to-br from-story-border/60 to-story-card/80'
    : 'story-ring-unseen animate-story-ring animate-story-glow';

  const pulseClass = !seen ? 'animate-story-pulse' : '';

  const wrapperClass = [
    'group relative inline-flex shrink-0 items-center justify-center rounded-full',
    'transition-all duration-300 ease-out',
    'hover:scale-105 hover:shadow-[0_0_20px_rgba(48,215,171,0.3)]',
    s.wrap,
    ringClass,
    pulseClass,
  ].join(' ');

  const inner = (
    <span
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded-full',
        'bg-story-bg font-semibold tracking-wide text-story-text',
        'ring-1 ring-story-bg/50',
        s.inner,
      ].join(' ')}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt={initials} className="h-full w-full object-cover" />
      ) : isOwner ? (
        <span className="text-story-accent transition-transform duration-300 group-hover:rotate-90 group-hover:scale-110">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
      ) : (
        <span className="transition-transform duration-200 group-hover:scale-110">{initials}</span>
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
