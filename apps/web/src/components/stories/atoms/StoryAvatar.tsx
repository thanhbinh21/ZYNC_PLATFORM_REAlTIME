import type { StoryAvatarProps } from '../stories.types';

const SIZE = {
  sm: { wrap: 'h-12 w-12 p-[2px]', inner: 'h-[44px] w-[44px] text-[0.65rem]' },
  md: { wrap: 'h-[72px] w-[72px] p-[3px]', inner: 'h-[64px] w-[64px] text-sm' },
  lg: { wrap: 'h-20 w-20 p-[3px]', inner: 'h-[72px] w-[72px] text-base' },
};

export function StoryAvatar({
  initials,
  avatarUrl,
  seen,
  isOwner,
  size = 'md',
  showLiveBadge,
  storyCount,
  dimmed,
  onClick,
}: StoryAvatarProps) {
  const s = SIZE[size];

  const ringClass = seen
    ? 'bg-gradient-to-br from-story-border/60 to-story-card/80'
    : 'story-ring-unseen animate-story-ring animate-story-glow';

  const pulseClass = !seen && !isOwner ? 'animate-story-pulse' : '';
  const dimmedClass = dimmed ? 'story-seen-dimmed' : '';

  const wrapperClass = [
    'group relative inline-flex shrink-0 items-center justify-center rounded-full',
    'transition-all duration-300 ease-out',
    'hover:scale-105 hover:shadow-[0_0_24px_rgba(48,215,171,0.35)]',
    s.wrap,
    ringClass,
    pulseClass,
    dimmedClass,
  ].join(' ');

  const inner = (
    <span
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded-full',
        'bg-story-bg font-semibold tracking-wide text-story-text',
        'ring-1 ring-story-bg/50',
        'transition-transform duration-300',
        s.inner,
      ].join(' ')}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={initials}
          className="h-full w-full rounded-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : isOwner ? (
        <span className="text-story-accent transition-all duration-300 group-hover:rotate-90 group-hover:scale-110">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </span>
      ) : (
        <span className="transition-transform duration-200 group-hover:scale-110">{initials}</span>
      )}
    </span>
  );

  const badges = (
    <>
      {/* Story count badge */}
      {storyCount && storyCount > 1 && (
        <span className="absolute -right-0.5 -top-0.5 z-10 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-story-accent to-emerald-500 px-1 text-[0.55rem] font-bold text-story-bg shadow-[0_2px_8px_rgba(48,215,171,0.4)] ring-2 ring-story-surface animate-story-scale-in">
          {storyCount}
        </span>
      )}
      {/* Live badge */}
      {showLiveBadge && (
        <span className="absolute -bottom-1 left-1/2 z-10 -translate-x-1/2 rounded-sm bg-gradient-to-r from-red-500 to-rose-500 px-1.5 py-px text-[0.5rem] font-bold uppercase tracking-wider text-white shadow-[0_2px_8px_rgba(239,68,68,0.4)] ring-1 ring-story-bg">
          LIVE
        </span>
      )}
      {/* Unseen dot indicator */}
      {!seen && !isOwner && !storyCount && (
        <span className="story-unseen-dot animate-story-dot-pulse" />
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={isOwner ? 'Tạo story' : `Xem story của ${initials}`}
        className={`${wrapperClass} story-focus-ring`}
      >
        {inner}
        {badges}
      </button>
    );
  }

  return (
    <div className={wrapperClass}>
      {inner}
      {badges}
    </div>
  );
}
