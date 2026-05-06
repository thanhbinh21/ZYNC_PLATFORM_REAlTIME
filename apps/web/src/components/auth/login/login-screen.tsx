// Module: auth | Component: LoginScreen | Type: presentational
// Depends: login.types
'use client';

import type { LoginScreenProps } from './login.types';
import { ShellFooter } from './molecules/shell-footer';
import { LoginCard } from './organisms/login-card';
import { LoginHero } from './organisms/login-hero';
import { LoginSubmitToast } from './atoms/login-submit-toast';

export function LoginScreen({
  mockData,
  mode,
  step,
  isRecoveryFlow,
  values,
  isSubmitting,
  infoMessage,
  errorMessage,
  currentUserName,
  onModeChange,
  onStartRecovery,
  onCancelRecovery,
  onIdentifierChange,
  onUsernameChange,
  onDisplayNameChange,
  onPasswordChange,
  onOtpChange,
  onRequestOtp,
  onVerifyOtp,
  onGoogleLogin,
  onBackToInput,
  onLogout,
  loadingMessage,
  showLoadingModal,
  toastMessage,
  toastVariant,
  onToastDismiss,
}: LoginScreenProps) {
  return (
    <main className="zync-auth-shell min-h-screen">
      {/* Ambient background layers */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="auth-glow auth-glow-1" />
        <div className="auth-glow auth-glow-2" />
        <div className="auth-glow auth-glow-3" />
      </div>

      {/* Content wrapper */}
      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="zync-page-container flex flex-1 flex-col lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          {/* Hero section - left side on desktop */}
          <div className="zync-reveal-up flex-1 py-12 lg:py-20">
            <LoginHero data={mockData} />
          </div>

          {/* Auth card - right side on desktop */}
          <div className="zync-reveal-up zync-reveal-delay-1 flex-shrink-0 pb-8 pt-4 lg:py-20">
            <LoginCard
              title={mockData.cardTitle}
              subtitle={mockData.cardSubtitle}
              mode={mode}
              step={step}
              isRecoveryFlow={isRecoveryFlow}
              values={values}
              isSubmitting={isSubmitting}
              infoMessage={infoMessage}
              errorMessage={errorMessage}
              currentUserName={currentUserName}
              onModeChange={onModeChange}
              onStartRecovery={onStartRecovery}
              onCancelRecovery={onCancelRecovery}
              onIdentifierChange={onIdentifierChange}
              onUsernameChange={onUsernameChange}
              onDisplayNameChange={onDisplayNameChange}
              onPasswordChange={onPasswordChange}
              onOtpChange={onOtpChange}
              onRequestOtp={onRequestOtp}
              onVerifyOtp={onVerifyOtp}
              onGoogleLogin={onGoogleLogin}
              onBackToInput={onBackToInput}
              onLogout={onLogout}
              loginTabLabel={mockData.loginTabLabel}
              registerTabLabel={mockData.registerTabLabel}
              socialTitle={mockData.socialTitle}
              registerHint={mockData.registerHint}
              loginHint={mockData.loginHint}
              loginHintAction={mockData.loginHintAction}
              registerHintAction={mockData.registerHintAction}
            />
          </div>
        </div>

        {/* Footer - Mobile only */}
        <div className="lg:hidden">
          <ShellFooter
            brand={mockData.brand}
            copyright={mockData.footer.copyright}
            links={mockData.footer.links}
            statusLabel={mockData.footer.statusLabel}
          />
        </div>
      </div>

      {/* Desktop footer - positioned at bottom */}
      <div className="absolute bottom-0 left-0 right-0 hidden lg:block">
        <ShellFooter
          brand={mockData.brand}
          copyright={mockData.footer.copyright}
          links={mockData.footer.links}
          statusLabel={mockData.footer.statusLabel}
        />
      </div>

      {/* Floating toast */}
      <LoginSubmitToast
        message={toastMessage ?? null}
        variant={toastVariant ?? 'info'}
        onDismiss={onToastDismiss ?? (() => {})}
      />
    </main>
  );
}
