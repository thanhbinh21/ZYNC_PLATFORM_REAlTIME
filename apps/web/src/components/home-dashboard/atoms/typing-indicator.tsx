'use client';

interface TypingIndicatorProps {
  userNames: string[];
}

export function TypingIndicator({ userNames }: TypingIndicatorProps) {
  if (userNames.length === 0) return null;

  const text = userNames.length === 1 ? `${userNames[0]} đang` : `${userNames.join(', ')} đang`;

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-sm text-[#99c2b3] italic">
      <span>{text} soạn tin...</span>
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-[#33e2b3] rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
        <div className="w-2 h-2 bg-[#33e2b3] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
        <div className="w-2 h-2 bg-[#33e2b3] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
      </div>
    </div>
  );
}
