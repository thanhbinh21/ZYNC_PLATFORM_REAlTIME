import type { ReactionButtonProps } from '../stories.types';

export function ReactionButton({ emoji, active, onClick }: ReactionButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(emoji)}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-xl transition-all duration-200 ${
        active
          ? 'scale-110 bg-white/25 ring-2 ring-[#30d7ab] shadow-[0_0_10px_rgba(48,215,171,0.3)]'
          : 'hover:scale-125 hover:bg-white/15'
      }`}
    >
      {emoji}
    </button>
  );
}
