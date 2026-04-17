interface PrimaryButtonProps {
  isSubmitting: boolean;
  label: string;
}

export function PrimaryButton({ isSubmitting, label }: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="zync-glass-floating h-12 w-full rounded-full border border-[#a8ffe0]/48 bg-gradient-to-r from-[#9affdd] to-[#2ecf9f] text-base font-semibold text-[#05392c] shadow-[0_10px_34px_rgba(48,215,171,0.32)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isSubmitting ? 'Đang xử lý...' : label}
    </button>
  );
}
