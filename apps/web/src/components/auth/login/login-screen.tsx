// Module: auth | Component: LoginScreen | Type: presentational
// Depends: login.types
'use client';

import type { LoginScreenProps } from './login.types';
import { ShellFooter } from './molecules/shell-footer';
import { LoginCard } from './organisms/login-card';
import { LoginHero } from './organisms/login-hero';

export function LoginScreen({
  mockData,
  values,
  isSubmitting,
  showPassword,
  errorMessage,
  onPhoneChange,
  onPasswordChange,
  onToggleShowPassword,
  onSubmit,
}: LoginScreenProps) {
  return (
    <main className="zync-auth-shell min-h-screen text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="zync-layer zync-layer-left" />
        <div className="zync-layer zync-layer-right" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-94px)] w-full max-w-6xl items-center gap-12 px-6 py-10 lg:grid-cols-[1fr_auto] lg:gap-20 lg:px-10">
        <LoginHero data={mockData} />

        <LoginCard
          title={mockData.cardTitle}
          subtitle={mockData.cardSubtitle}
          values={values}
          isSubmitting={isSubmitting}
          showPassword={showPassword}
          errorMessage={errorMessage}
          onPhoneChange={onPhoneChange}
          onPasswordChange={onPasswordChange}
          onToggleShowPassword={onToggleShowPassword}
          onSubmit={onSubmit}
        />
      </div>

      <ShellFooter
        brand={mockData.brand}
        copyright={mockData.footer.copyright}
        links={mockData.footer.links}
        statusLabel={mockData.footer.statusLabel}
      />
    </main>
  );
}
