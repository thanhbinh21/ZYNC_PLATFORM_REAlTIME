import { ReactionButton } from '../atoms/ReactionButton';
import { REACTION_TYPES, type ReactionPickerProps } from '../stories.types';

export function ReactionPicker({ onSelect, activeEmoji }: ReactionPickerProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-black/50 px-2 py-1.5 shadow-2xl backdrop-blur-xl">
      {REACTION_TYPES.map((emoji) => (
        <ReactionButton
          key={emoji}
          emoji={emoji}
          active={activeEmoji === emoji}
          onClick={onSelect}
        />
      ))}
    </div>
  );
}
