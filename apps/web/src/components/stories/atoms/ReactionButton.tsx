import type { ReactionButtonProps } from '../stories.types';

export function ReactionButton({ emoji, active, onClick }: ReactionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(emoji)}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 ${
        active ? 'scale-110 bg-white/20 ring-2 ring-[#30d7ab]' : 'bg-white/10 hover:bg-white/20'
      }`}
    >
      {emoji}
    </button>
  );
}
