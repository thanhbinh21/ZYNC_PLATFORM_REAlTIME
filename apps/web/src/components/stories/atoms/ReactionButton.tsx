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
          ? 'scale-110 bg-white/20 ring-2 ring-story-accent shadow-[0_0_12px_rgba(48,215,171,0.35)] animate-story-float'
          : 'hover:scale-[1.3] hover:bg-white/10 active:scale-95',
      ].join(' ')}
    >
      <span className={active ? 'animate-story-reaction-pop' : 'transition-transform duration-150'}>{emoji}</span>
    </button>
  );
}
