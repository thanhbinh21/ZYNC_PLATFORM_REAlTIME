interface FormFieldProps {
  label: string;
  type: 'tel' | 'password' | 'text';
  placeholder: string;
  value: string;
  disabled?: boolean;
  showPassword?: boolean;
  error?: string;
  onChange: (value: string) => void;
  rightNode?: React.ReactNode;
}

function FieldIcon({ type }: { type: 'tel' | 'password' | 'text' }) {
  if (type === 'password') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    );
  }

  if (type === 'tel') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    );
  }

  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

export function FormField({
  label,
  type,
  placeholder,
  value,
  disabled,
  error,
  onChange,
  rightNode,
}: FormFieldProps) {
  const hasValue = value.length > 0;
  const isFocused = false; // We can't track focus state without additional state, so we rely on :focus-within

  return (
    <div className="group">
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">
          {label}
        </label>
        {rightNode}
      </div>

      <div
        className={`relative flex h-12 items-center gap-3 rounded-xl border bg-surface-glass px-4 transition-all duration-200 ${
          error
            ? 'border-danger-border bg-danger-bg/30'
            : 'border-border-light group-focus-within:border-accent group-focus-within:bg-surface-glass-strong group-focus-within:shadow-[0_0_0_4px_var(--ring-soft)]'
        } ${disabled ? 'opacity-60' : ''}`}
      >
        <span className={`flex-shrink-0 transition-colors ${error ? 'text-danger-text' : 'text-text-tertiary group-focus-within:text-accent'}`}>
          <FieldIcon type={type} />
        </span>

        <input
          type={type === 'password' ? 'password' : type}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-[15px] text-text-primary outline-none placeholder:text-text-tertiary disabled:cursor-not-allowed"
        />

        {/* Floating label effect indicator */}
        {hasValue && (
          <span className="absolute -top-2.5 left-4 rounded bg-surface-glass px-1.5 text-[10px] font-medium text-accent">
            {label}
          </span>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-danger-text">{error}</p>
      )}
    </div>
  );
}
