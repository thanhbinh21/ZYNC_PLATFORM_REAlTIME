interface PrimaryButtonProps {
  isSubmitting: boolean;
  label: string;
}

export function PrimaryButton({ isSubmitting, label }: PrimaryButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className="zync-soft-button h-12 w-full rounded-full text-base disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isSubmitting ? 'Đang xử lý...' : label}
    </button>
  );
}
