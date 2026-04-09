import Image from 'next/image';
import Link from 'next/link';

import { HomeCta } from '../atoms/home-cta';
import { HomeFeatureCard } from '../molecules/home-feature-card';
import { HomeMetricCard } from '../molecules/home-metric-card';
import type { HomeScreenProps } from '../home.types';

export function HomeScreen({ data }: HomeScreenProps) {
  return (
    <main className="zync-auth-shell min-h-screen text-white">
      <div className="zync-layer zync-layer-left" aria-hidden />
      <div className="zync-layer zync-layer-right" aria-hidden />

      <header className="fixed left-0 right-0 top-0 z-30 border-b border-white/10 bg-[#06382d]/55 backdrop-blur-xl">
        <div className="zync-page-container py-3">
          <div className="rounded-full border border-white/15 bg-white/5 px-4 py-3">
            <div className="flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="relative block h-9 w-9 overflow-hidden rounded-xl bg-[#0a3e31] ring-1 ring-[#57d2a5]/40">
                <Image src="/logo.png" alt="Logo ZYNC" fill className="object-cover" sizes="36px" />
              </span>
              <span className="font-ui-brand text-xl tracking-wide text-[#e2fff4]">{data.brand}</span>
            </Link>

            <nav className="hidden items-center gap-8 lg:flex">
              {data.navItems.map((item) => (
                <a key={item.id} href={item.href} className="font-ui-content text-sm text-[#ccefe2] transition hover:text-white">
                  {item.label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-3 sm:flex">
              <Link
                href="/auth"
                className="font-ui-title inline-flex h-10 items-center justify-center rounded-full border border-white/20 px-5 text-sm text-[#d8f7eb] transition hover:bg-white/10"
              >
                {data.navAuthLabel}
              </Link>
              <Link
                href="/auth"
                className="font-ui-title inline-flex h-10 items-center justify-center rounded-full bg-[#50dbab] px-5 text-sm text-[#083f30] transition hover:brightness-110"
              >
                {data.navPrimaryLabel}
              </Link>
            </div>
          </div>
          </div>
        </div>
      </header>

      <div className="zync-page-container pb-10 pt-28 lg:pt-32">

        <section className="mt-10 grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="zync-reveal-left">
            <p className="font-ui-meta inline-flex rounded-full border border-[#58c9a3]/45 bg-[#0c4e3f]/65 px-4 py-1 text-xs tracking-[0.22em] text-[#c8f4e5]">
              {data.releaseLabel}
            </p>
            <h1 className="font-ui-title mt-6 max-w-[17ch] text-balance text-[clamp(2.5rem,6vw,5.2rem)] leading-[1.04] text-[#e7fff6]">
              {data.title}{' '}
              <span className="bg-gradient-to-r from-[#a5ffe0] to-[#52d9ab] bg-clip-text text-transparent">{data.titleAccent}</span>
            </h1>
            <p className="font-ui-content mt-6 max-w-[44ch] text-balance text-[clamp(1rem,1.9vw,1.3rem)] leading-8 text-[#b4dbc9]">
              {data.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <HomeCta label={data.ctaPrimary} href="/auth" variant="primary" />
              <HomeCta label={data.ctaSecondary} href="#features" variant="secondary" />
            </div>
          </div>

          <aside className="zync-reveal-right zync-reveal-delay-1 rounded-[2rem] border border-white/15 bg-white/8 p-6 backdrop-blur-xl">
            <p className="font-ui-title text-lg text-[#e6fff5]">{data.globalTitle}</p>
            <p className="font-ui-content mt-3 text-sm leading-7 text-[#b5ddcc]">{data.globalSubtitle}</p>
            <div className="mt-6 space-y-3">
              {data.metrics.map((metric) => (
                <div key={metric.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#0b4738]/55 px-4 py-3">
                  <p className="font-ui-content text-sm text-[#c6eddd]">{metric.label}</p>
                  <p className="font-ui-title text-lg text-[#ecfff8]">{metric.value}</p>
                </div>
              ))}
            </div>
          </aside>
        </section>

        <section id="features" className="zync-reveal-up zync-reveal-delay-1 mt-12 grid gap-4 md:grid-cols-3">
          {data.features.map((feature) => (
            <HomeFeatureCard key={feature.id} item={feature} />
          ))}
        </section>

        <section id="security" className="zync-reveal-up zync-reveal-delay-2 mt-8 grid gap-4 md:grid-cols-3" aria-label="Thống kê hiệu năng">
          {data.metrics.map((metric) => (
            <HomeMetricCard key={`detail-${metric.id}`} item={metric} />
          ))}
        </section>

        <section id="platforms" className="zync-reveal-up zync-reveal-delay-2 mt-10 rounded-[2rem] border border-[#65d8b1]/35 bg-gradient-to-r from-[#0a4738]/80 to-[#0d5844]/70 p-7 backdrop-blur-xl">
          <h2 className="font-ui-title max-w-[26ch] text-balance text-[clamp(1.5rem,3vw,2.15rem)] leading-tight text-[#ecfff8]">
            {data.ctaBlockTitle}
          </h2>
          <p className="font-ui-content mt-3 max-w-[56ch] text-balance text-base leading-7 text-[#b8dfcf]">{data.ctaBlockSubtitle}</p>
          <div className="mt-6">
            <HomeCta label={data.ctaBlockButton} href="/auth" variant="primary" />
          </div>
        </section>

        <footer id="pricing" className="zync-reveal-up zync-reveal-delay-3 mt-8 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-5 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-ui-brand text-base tracking-wide text-[#d7f6ea]">{data.footerBrand}</p>
            <p className="font-ui-content mt-1 text-sm text-[#9fcab9]">{data.footerCopyright}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {data.footerLinks.map((item) => (
              <a
                key={item.id}
                href={item.href}
                className="font-ui-content rounded-full border border-white/15 px-4 py-1.5 text-sm text-[#cdefe2] transition hover:bg-white/10"
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
