import { ButtonSpinner } from '@/components/shared/loading-system';

interface PrimaryButtonProps {
  isSubmitting: boolean;
  label: string;
}

export function PrimaryButton({ isSubmitting, label }: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#0F766E] px-6 text-base font-black text-white shadow-[0_20px_45px_-22px_rgba(15,118,110,0.9)] transition hover:-translate-y-0.5 hover:bg-[#0B5F59] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
    >
      {isSubmitting ? <ButtonSpinner size="sm" tone="light" /> : null}
      {isSubmitting ? 'Đang xử lý...' : label}
    </button>
  );
}
