import Image from 'next/image';
import Link from 'next/link';

import { HomeCta } from '../atoms/home-cta';
import { HomeFeatureCard } from '../molecules/home-feature-card';
import { HomeMetricCard } from '../molecules/home-metric-card';
import type { HomeScreenProps } from '../home.types';

export function HomeScreen({ data }: HomeScreenProps) {
  const assistantBadges = ['Gemini', 'Claude', 'OpenAI'];
  const workflowSteps = ['Discover', 'Review', 'Ship'];

  return (
    <main className="zync-page-shell min-h-screen text-text-primary">
      <header className="fixed left-0 right-0 top-0 z-30">
        <div className="zync-page-container py-3">
          <div className="zync-soft-topbar rounded-full px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <Link href="/" className="flex items-center gap-3">
                <span className="relative block h-10 w-10 overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-sm">
                  <Image src="/logo.png" alt="Logo ZYNC" fill className="object-cover" sizes="40px" />
                </span>
                <span className="font-ui-brand text-xl tracking-wide text-text-primary">{data.brand}</span>
              </Link>

              <nav className="hidden items-center gap-8 lg:flex">
                {data.navItems.map((item) => (
                  <a key={item.id} href={item.href} className="font-ui-content text-sm text-text-secondary transition hover:text-text-primary">
                    {item.label}
                  </a>
                ))}
              </nav>

              <div className="hidden items-center gap-3 sm:flex">
                <Link href="/auth" className="zync-soft-button-secondary px-5 py-2.5 text-sm">
                  {data.navAuthLabel}
                </Link>
                <Link href="/auth" className="zync-soft-button px-5 py-2.5 text-sm">
                  {data.navPrimaryLabel}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="zync-page-container pb-14 pt-28 lg:pt-32">
        <section className="mt-10 grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="zync-reveal-left">
            <p className="zync-soft-kicker">{data.releaseLabel}</p>
            <h1 className="font-ui-title mt-6 max-w-[15ch] text-balance text-[clamp(3rem,6vw,5.6rem)] leading-[0.98] text-text-primary">
              {data.title}{' '}
              <span className="bg-gradient-to-r from-accent-strong via-accent to-[#56d6ad] bg-clip-text text-transparent">{data.titleAccent}</span>
            </h1>
            <p className="font-ui-content mt-6 max-w-[46ch] text-balance text-[clamp(1rem,1.9vw,1.3rem)] leading-8 text-text-secondary">
              {data.subtitle}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {assistantBadges.map((badge) => (
                <span key={badge} className="zync-soft-badge text-sm">
                  Ho tro {badge}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <HomeCta label={data.ctaPrimary} href="/auth" variant="primary" />
              <HomeCta label={data.ctaSecondary} href="#features" variant="secondary" />
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {data.metrics.map((metric) => (
                <div key={metric.id} className="zync-soft-card rounded-[1.6rem] p-5">
                  <div className="zync-soft-stat">
                    <span className="zync-soft-stat-value">{metric.value}</span>
                    <span className="font-ui-title text-sm text-text-primary">{metric.label}</span>
                    <span className="font-ui-content text-sm text-text-secondary">{metric.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="zync-reveal-right zync-reveal-delay-1 zync-soft-card zync-soft-card-elevated rounded-[2rem] p-6 sm:p-8">
            <div className="zync-soft-stepper">
              {workflowSteps.map((step, index) => (
                <span
                  key={step}
                  className={`zync-soft-step ${index === 1 ? 'zync-soft-step-active' : ''}`}
                >
                  {step}
                </span>
              ))}
            </div>

            <div className="mt-6 rounded-[1.6rem] p-5 sm:p-6 zync-soft-card-muted">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-ui-meta text-[0.72rem] uppercase tracking-[0.18em] text-accent-strong">Live Workspace</p>
                  <h2 className="font-ui-title mt-2 text-[clamp(1.45rem,3vw,2.2rem)] leading-tight text-text-primary">
                    {data.globalTitle}
                  </h2>
                  <p className="font-ui-content mt-3 max-w-[32ch] text-sm leading-7 text-text-secondary">
                    {data.globalSubtitle}
                  </p>
                </div>
                <span className="zync-soft-badge zync-soft-badge-active">AI Ready</span>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-ui-content text-text-secondary">Community momentum</span>
                  <span className="font-ui-title text-accent-strong">78%</span>
                </div>
                <div className="zync-soft-progress">
                  <span className="zync-soft-progress-bar" style={{ width: '78%' }} />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {data.features.map((feature) => (
                  <div key={feature.id} className="flex items-center justify-between gap-3 rounded-[1.1rem] border border-border bg-white/50 px-4 py-3">
                    <div>
                      <p className="font-ui-title text-sm text-text-primary">{feature.title}</p>
                      <p className="font-ui-content text-sm text-text-secondary">{feature.description}</p>
                    </div>
                    <span className="zync-soft-badge text-xs">Ready</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {data.metrics.map((metric) => (
                <div key={`hero-${metric.id}`} className="rounded-[1.4rem] border border-border bg-white/55 px-4 py-4">
                  <p className="font-ui-title text-[1.8rem] leading-none text-accent-strong">{metric.value}</p>
                  <p className="font-ui-meta mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-text-tertiary">{metric.label}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section id="features" className="zync-reveal-up zync-reveal-delay-1 mt-14 grid gap-4 md:grid-cols-3">
          {data.features.map((feature) => (
            <HomeFeatureCard key={feature.id} item={feature} />
          ))}
        </section>

        <section id="security" className="zync-reveal-up zync-reveal-delay-2 mt-8 grid gap-4 md:grid-cols-3" aria-label="Thong ke hieu nang">
          {data.metrics.map((metric) => (
            <HomeMetricCard key={`detail-${metric.id}`} item={metric} />
          ))}
        </section>

        <section id="platforms" className="zync-reveal-up zync-reveal-delay-2 zync-soft-card zync-soft-card-elevated mt-10 rounded-[2rem] p-7 sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="zync-soft-kicker">Build With Confidence</span>
              <h2 className="font-ui-title mt-5 max-w-[22ch] text-balance text-[clamp(1.8rem,3vw,2.5rem)] leading-tight text-text-primary">
                {data.ctaBlockTitle}
              </h2>
              <p className="font-ui-content mt-3 max-w-[58ch] text-balance text-base leading-7 text-text-secondary">
                {data.ctaBlockSubtitle}
              </p>
            </div>
            <HomeCta label={data.ctaBlockButton} href="/auth" variant="primary" />
          </div>
        </section>

        <footer id="pricing" className="zync-reveal-up zync-reveal-delay-3 zync-soft-glass mt-8 flex flex-col gap-4 rounded-[1.8rem] px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-ui-brand text-base tracking-wide text-text-primary">{data.footerBrand}</p>
            <p className="font-ui-content mt-1 text-sm text-text-secondary">{data.footerCopyright}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.footerLinks.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="zync-soft-badge text-sm hover:text-text-primary"
              >
                {item.label}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </main>
  );
}
