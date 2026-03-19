interface FormFieldProps {
  label: string;
  type: 'tel' | 'password' | 'text';
  placeholder: string;
  value: string;
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
  showPassword,
  onChange,
  rightNode,
}: FormFieldProps) {
  const realType = type === 'password' ? (showPassword ? 'text' : 'password') : type;

  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9ab9af]">
        <span>{label}</span>
        {rightNode}
      </div>
      <div className="flex h-12 items-center gap-2 rounded-xl border border-[#1d5c4c] bg-[#0f4337]/70 px-3 transition focus-within:border-[#3ed8aa]">
        <FieldIcon type={type} />
        <input
          type={realType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-[15px] text-[#d8eee6] outline-none placeholder:text-[#5f897d]"
        />
      </div>
    </label>
  );
}
