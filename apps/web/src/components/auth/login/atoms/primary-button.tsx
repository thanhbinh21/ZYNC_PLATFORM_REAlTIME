interface PrimaryButtonProps {
  isSubmitting: boolean;
}

export function PrimaryButton({ isSubmitting }: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="h-12 w-full rounded-full bg-gradient-to-r from-[#49dfb3] to-[#159264] text-base font-semibold text-[#07372b] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isSubmitting ? 'Logging In...' : 'Log In'}
    </button>
  );
}
