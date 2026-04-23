import type { ReactionButtonProps } from '../stories.types';

export function ReactionButton({ emoji, active, onClick }: ReactionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(emoji)}
      className={[
        'inline-flex h-11 w-11 items-center justify-center rounded-full text-xl',
        'transition-all duration-200 ease-out',
        active
          ? 'scale-110 bg-white/20 ring-2 ring-story-accent shadow-[0_0_16px_rgba(48,215,171,0.4)] animate-story-float'
          : 'hover:scale-[1.35] hover:bg-white/10 hover:shadow-[0_0_12px_rgba(255,255,255,0.08)] active:scale-90',
      ].join(' ')}
    >
      <span
        className={[
          active ? 'animate-story-reaction-pop' : 'transition-transform duration-150',
          'will-change-transform',
        ].join(' ')}
      >
        {emoji}
      </span>
    </button>
  );
}
