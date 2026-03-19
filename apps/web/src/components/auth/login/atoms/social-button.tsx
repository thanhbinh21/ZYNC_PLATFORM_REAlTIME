interface SocialButtonProps {
  label: string;
}

export function SocialButton({ label }: SocialButtonProps) {
  return (
    <button
      type="button"
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#1a5748] bg-[#083b31]/70 text-sm font-semibold text-[#d3eee5] transition hover:border-[#2f8f73] hover:bg-[#0c4a3b]"
    >
      <span className="text-xs text-[#a8c9be]">■</span>
      <span>{label}</span>
    </button>
  );
}
