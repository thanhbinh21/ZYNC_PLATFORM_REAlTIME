interface ShellFooterProps {
  brand: string;
  copyright: string;
  links: string[];
  statusLabel: string;
}

export function ShellFooter({ brand, copyright, links, statusLabel }: ShellFooterProps) {
  return (
    <footer className="relative z-10 border-t zync-glass-divider bg-[#053328]/45 px-6 py-7 backdrop-blur-xl lg:px-10">
      <div className="zync-page-container flex flex-col gap-6 text-[#accdc2] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-ui-brand text-2xl font-semibold tracking-wide text-[#81ffd6]">{brand}</p>
          <p className="font-ui-meta mt-2 text-xs text-[#c6e4db]">{copyright}</p>
        </div>

        <div className="font-ui-meta flex flex-wrap items-center gap-6 text-xs">
          {links.map((link) => (
            <button key={link} type="button" className="transition hover:text-[#f0fffa]">
              {link}
            </button>
          ))}
          <span className="inline-flex items-center gap-2 text-[#93ffdb]">
            <span className="h-2 w-2 rounded-full bg-[#70ffd2] shadow-[0_0_10px_rgba(112,255,210,0.75)]" />
            {statusLabel}
          </span>
        </div>
      </div>
    </footer>
  );
}
