interface ShellFooterProps {
  brand: string;
  copyright: string;
  links: string[];
  statusLabel: string;
}

export function ShellFooter({ brand, copyright, links, statusLabel }: ShellFooterProps) {
  return (
    <footer className="relative z-10 border-t border-border-light bg-surface-glass px-6 py-7 backdrop-blur-xl lg:px-10">
      <div className="zync-page-container flex flex-col gap-6 text-text-secondary lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-ui-brand text-2xl font-semibold tracking-wide text-text-primary">{brand}</p>
          <p className="font-ui-meta mt-2 text-xs text-text-tertiary">{copyright}</p>
        </div>

        <div className="font-ui-meta flex flex-wrap items-center gap-6 text-xs">
          {links.map((link) => (
            <button key={link} type="button" className="transition hover:text-text-primary">
              {link}
            </button>
          ))}
          <span className="inline-flex items-center gap-2 text-accent-strong">
            <span className="h-2 w-2 rounded-full bg-accent shadow-sm" />
            {statusLabel}
          </span>
        </div>
      </div>
    </footer>
  );
}
