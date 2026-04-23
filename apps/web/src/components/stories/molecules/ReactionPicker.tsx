import { ReactionButton } from '../atoms/ReactionButton';
import { REACTION_TYPES, type ReactionPickerProps } from '../stories.types';

export function ReactionPicker({ onSelect, activeEmoji }: ReactionPickerProps) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.1] bg-black/60 px-3 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.5),0_0_0_1px_rgba(48,215,171,0.06)] backdrop-blur-2xl animate-story-scale-in">
      {REACTION_TYPES.map((emoji, i) => (
        <div key={emoji} className="animate-story-reaction-pop" style={{ animationDelay: `${i * 45}ms` }}>
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
