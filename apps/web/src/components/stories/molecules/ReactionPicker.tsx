import { ReactionButton } from '../atoms/ReactionButton';
import { REACTION_TYPES, type ReactionPickerProps } from '../stories.types';

export function ReactionPicker({ onSelect, activeEmoji }: ReactionPickerProps) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-black/50 px-3 py-2 backdrop-blur-md">
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
