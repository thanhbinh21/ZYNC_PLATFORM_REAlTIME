import { REACTION_TYPES, type StoryReactionsModalProps } from '../stories.types';

export function StoryReactionsModal({ open, reactions, onClose }: StoryReactionsModalProps) {
  if (!open) return null;

  const grouped = REACTION_TYPES.map((emoji) => ({
    emoji,
    entries: reactions.filter((r) => r.type === emoji),
  })).filter((g) => g.entries.length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-sm rounded-3xl border border-[#1a5140] bg-[#062920] p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-[#87ac9f] transition hover:text-white"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        <h2 className="font-ui-title text-lg text-[#e4fff5]">Reactions</h2>

        {grouped.length === 0 && (
          <p className="font-ui-content mt-4 text-sm text-[#87ac9f]">Chưa có reaction nào.</p>
        )}

        <div className="mt-4 max-h-72 space-y-4 overflow-y-auto pr-1">
          {grouped.map(({ emoji, entries }) => (
            <div key={emoji}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{emoji}</span>
                <span className="font-ui-meta text-xs text-[#87ac9f]">{entries.length}</span>
              </div>
              <div className="mt-2 space-y-2">
                {entries.map((r) => (
                  <div key={r.userId} className="flex items-center gap-3 rounded-xl bg-[#0b3228] px-3 py-2">
                    {r.avatarUrl ? (
                      <img src={r.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#1a5140] text-xs font-semibold text-[#e2fff5]">
                        {r.displayName.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span className="font-ui-content text-sm text-[#cdece0]">{r.displayName}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
