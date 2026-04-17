interface FormFieldProps {
  label: string;
  type: 'tel' | 'password' | 'text';
  placeholder: string;
  value: string;
  disabled?: boolean;
  showPassword?: boolean;
  onChange: (value: string) => void;
  rightNode?: React.ReactNode;
}

function FieldIcon({ type }: { type: 'tel' | 'password' | 'text' }) {
  if (type === 'password') {
    return (
      <span className="text-[#7ca79a]" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M7 11V8C7 5.23858 9.23858 3 12 3C14.7614 3 17 5.23858 17 8V11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        </svg>
      </span>
    );
  }

  return (
    <span className="text-[#7ca79a]" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="7" y="2" width="10" height="20" rx="2" stroke="currentColor" strokeWidth="1.8"/>
        <circle cx="12" cy="18" r="1.2" fill="currentColor"/>
      </svg>
    </span>
  );
}

export function FormField({
  label,
  type,
  placeholder,
  value,
  disabled,
  showPassword,
  onChange,
  rightNode,
}: FormFieldProps) {
  const realType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-[#c0e3d6]">
        <span>{label}</span>
        {rightNode}
      </div>
      <div className="zync-glass-subtle flex h-12 items-center gap-2 rounded-xl border-[#7ff0c7]/28 px-3 transition focus-within:border-[#9bffe0] focus-within:bg-[#184f40]/66">
        <FieldIcon type={type} />
        <input
          type={realType}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-[15px] text-[#eefff9] outline-none placeholder:text-[#9bc3b5]"
        />
      </div>
    </label>
  );
}
