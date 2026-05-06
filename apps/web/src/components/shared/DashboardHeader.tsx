'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import type { DashboardHomeMockData } from '../home-dashboard/home-dashboard.types';
import { DashboardIcon } from '../home-dashboard/atoms/dashboard-icon';

interface DashboardHeaderProps {
  data: DashboardHomeMockData;
  activeNavId?: string;
  onNavSelect?: (id: string) => void;
  theme?: string;
  onToggleTheme?: () => void;
  notificationSlot?: React.ReactNode;
}

export function DashboardHeader({
  data,
  activeNavId,
  onNavSelect,
  theme,
  onToggleTheme,
  notificationSlot,
}: DashboardHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const router = useRouter();

  const handleSelectNav = (id: string) => {
    if (id === 'logout') {
      onNavSelect?.(id);
      return;
    }
    if (id === 'home') {
      router.push('/home');
    } else if (id === 'chat') {
      router.push('/chat');
    } else if (id === 'friends') {
      router.push('/friends');
    } else if (id === 'community') {
      router.push('/community');
    } else if (id === 'explore') {
      router.push('/explore');
    } else if (id === 'settings') {
      router.push('/settings');
    }
    onNavSelect?.(id);
    setIsMobileMenuOpen(false);
  };

  const getNavHref = (id: string): string => {
    switch (id) {
      case 'home': return '/home';
      case 'chat': return '/chat';
      case 'friends': return '/friends';
      case 'community': return '/community';
      case 'explore': return '/explore';
      case 'settings': return '/settings';
      default: return '#';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 px-2 pt-2 pb-2 sm:px-4 sm:pt-4 sm:pb-4">
        <div className="zync-soft-topbar flex h-16 items-center justify-between rounded-[1.75rem] px-4 lg:px-6">
          <div className="flex items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-3">
              <span className="relative block h-10 w-10 overflow-hidden rounded-2xl bg-white ring-1 ring-border shadow-sm">
                <Image src="/logo.png" alt="Logo Zync" fill className="object-cover" sizes="40px" priority />
              </span>
              <div className="hidden sm:block">
                <p className="font-ui-brand text-xl leading-none text-text-primary">{data.brand}</p>
                <p className="font-ui-meta mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-text-tertiary">Cộng đồng nhà phát triển</p>
              </div>
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              {data.navItems.map((item) => (
                <a
                  key={item.id}
                  href={getNavHref(item.id)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    activeNavId === item.id
                      ? 'bg-accent text-[var(--bg-primary)] shadow-sm'
                      : 'border border-border bg-[var(--surface-glass)] text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <DashboardIcon name={item.icon} className="h-4 w-4" />
                    {item.label}
                  </span>
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onToggleTheme}
              className={`zync-soft-badge hidden text-xs sm:inline-flex ${theme === 'dark' ? 'zync-soft-badge-active' : ''}`}
              title="Chuyển đổi giao diện"
            >
              {theme === 'dark' ? 'Sáng' : 'Tối'}
            </button>

            {notificationSlot ?? (
              <button type="button" className="zync-soft-badge h-10 w-10 p-0">
                <DashboardIcon name="bell" className="h-4 w-4" />
              </button>
            )}

            <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
              {data.sideFooterItems.map((item) => (
                <a
                  key={item.id}
                  href={getNavHref(item.id)}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    activeNavId === item.id
                      ? 'bg-accent text-[var(--bg-primary)] shadow-sm'
                      : 'border border-border bg-[var(--surface-glass)] text-text-secondary hover:text-text-primary'
                  }`}
                  title={item.label}
                >
                  <span className="flex items-center gap-2">
                    <DashboardIcon name={item.icon} className="h-4 w-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </span>
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={() => handleSelectNav('profile')}
              className="flex items-center gap-2 rounded-full border border-border bg-[var(--surface-glass)] p-1 pl-2 transition hover:bg-[var(--surface-glass-strong)]"
            >
              <span className="font-ui-title hidden text-sm text-text-primary lg:block">{data.user.displayName}</span>
              <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-accent-light text-xs font-semibold text-accent-strong">
                {data.user.avatarUrl ? (
                  <Image src={data.user.avatarUrl} alt={data.user.displayName} width={32} height={32} className="h-full w-full object-cover" />
                ) : (
                  data.user.initials
                )}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-[var(--surface-glass)] text-text-secondary md:hidden"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <aside className="absolute right-3 top-3 bottom-3 w-[min(82vw,320px)] rounded-[1.8rem] zync-soft-card zync-soft-card-elevated p-5" onClick={(event) => event.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <span className="zync-soft-kicker">Điều hướng</span>
                <p className="font-ui-title mt-3 text-lg text-text-primary">Menu workspace</p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="zync-soft-button-ghost h-10 w-10 p-0 text-base">
                <span className="font-ui-content text-xs">Đóng</span>
              </button>
            </div>

            <nav className="flex flex-col gap-2">
              {data.navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectNav(item.id)}
                  className={`flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left transition ${
                    activeNavId === item.id
                      ? 'bg-accent text-[var(--bg-primary)] shadow-sm'
                      : 'border border-border bg-[var(--surface-glass)] text-text-secondary'
                  }`}
                >
                  <DashboardIcon name={item.icon} className="h-[18px] w-[18px]" />
                  {item.label}
                </button>
              ))}

              <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
                {data.sideFooterItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelectNav(item.id)}
                    className={`flex items-center gap-3 rounded-[1rem] px-4 py-3 text-left transition ${
                      activeNavId === item.id
                        ? 'bg-accent text-[var(--bg-primary)] shadow-sm'
                        : 'border border-border bg-[var(--surface-glass)] text-text-secondary'
                    }`}
                  >
                    <DashboardIcon name={item.icon} className="h-[18px] w-[18px]" />
                    {item.label}
                  </button>
                ))}
              </div>
            </nav>

            <button
              onClick={() => handleSelectNav('logout')}
              className="zync-soft-button-danger mt-6 h-11 w-full text-sm"
            >
              Đăng xuất
            </button>
          </aside>
        </div>
      )}
    </>
  );
}
