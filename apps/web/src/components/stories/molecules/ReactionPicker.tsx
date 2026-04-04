import { ReactionButton } from '../atoms/ReactionButton';
import { REACTION_TYPES, type ReactionPickerProps } from '../stories.types';

export function ReactionPicker({ onSelect, activeEmoji }: ReactionPickerProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-black/50 px-2.5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.4)] backdrop-blur-2xl animate-story-fade-up">
      {REACTION_TYPES.map((emoji, i) => (
        <div key={emoji} className="animate-story-reaction-pop" style={{ animationDelay: `${i * 50}ms` }}>
          <ReactionButton
            emoji={emoji}
            active={activeEmoji === emoji}
            onClick={onSelect}
          />
        </div>
      ))}
    </div>
  );
}
