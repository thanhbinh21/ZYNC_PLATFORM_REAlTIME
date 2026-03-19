interface ShellFooterProps {
  brand: string;
  copyright: string;
  links: string[];
  statusLabel: string;
}

export function ShellFooter({ brand, copyright, links, statusLabel }: ShellFooterProps) {
  return (
    <footer className="relative z-10 border-t border-[#0d4a3b] bg-[#053328]/70 px-6 py-7 backdrop-blur-sm lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-[#7ea79a] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-2xl font-semibold tracking-wide text-[#39d7a8]">{brand}</p>
          <p className="mt-2 text-xs">{copyright}</p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-xs">
          {links.map((link) => (
            <button key={link} type="button" className="transition hover:text-[#d1eee5]">
              {link}
            </button>
          ))}
          <span className="inline-flex items-center gap-2 text-[#6dd9b3]">
            <span className="h-2 w-2 rounded-full bg-[#31d5a3]" />
            {statusLabel}
          </span>
        </div>
      </div>
    </footer>
  );
}
