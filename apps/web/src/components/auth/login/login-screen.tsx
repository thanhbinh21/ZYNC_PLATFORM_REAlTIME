// Module: auth | Component: LoginScreen | Type: presentational
// Depends: login.types
'use client';

import type { LoginScreenProps } from './login.types';

function DotLogo() {
  return (
    <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/20 bg-emerald-400/15 shadow-[inset_0_0_20px_rgba(15,190,130,0.25)]">
      <span className="grid grid-cols-3 gap-0.5">
        {Array.from({ length: 9 }).map((_, idx) => (
          <span
            key={idx}
            className="h-1.5 w-1.5 rounded-full bg-emerald-300"
            style={{ opacity: idx % 2 === 0 ? 1 : 0.5 }}
          />
        ))}
      </span>
    </span>
  );
}

export function LoginScreen({
  values,
  isSubmitting,
  showPassword,
  errorMessage,
  onPhoneChange,
  onPasswordChange,
  onToggleRemember,
  onToggleShowPassword,
  onSubmit,
}: LoginScreenProps) {
  return (
    <main className="zync-auth-shell min-h-screen text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="zync-glow zync-glow-left" />
        <div className="zync-glow zync-glow-right" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <section className="mb-12 max-w-xl lg:mb-0">
          <div className="mb-10 flex items-center gap-4">
            <DotLogo />
            <span className="text-4xl font-semibold tracking-wide">ZYNC</span>
          </div>

          <h1 className="text-balance text-5xl font-bold leading-[1.05] sm:text-6xl">
            Connect with
            <br />
            <span className="text-emerald-300">the world.</span>
          </h1>

          <p className="mt-8 max-w-lg text-lg leading-8 text-emerald-50/75">
            Experience the next generation of seamless communication. Secure, fast, and designed for your workflow.
          </p>
        </section>

        <section className="w-full max-w-md rounded-3xl border border-white/15 bg-white/10 p-8 shadow-[0_30px_60px_rgba(1,35,25,0.45)] backdrop-blur-xl sm:p-10">
          <h2 className="text-4xl font-bold tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-sm text-emerald-50/70">Enter your credentials to access your account</p>

          <form
            className="mt-8 space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void onSubmit();
            }}
          >
            <label className="block text-sm text-emerald-50/90">
              Phone Number
              <input
                type="tel"
                inputMode="tel"
                placeholder="+1 (555) 000-0000"
                value={values.phoneNumber}
                onChange={(event) => onPhoneChange(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-white/14 px-4 text-base text-white placeholder:text-emerald-50/40 outline-none ring-0 transition focus:border-emerald-300/50 focus:bg-white/20"
              />
            </label>

            <label className="block text-sm text-emerald-50/90">
              Password
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="********"
                  value={values.password}
                  onChange={(event) => onPasswordChange(event.target.value)}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/14 px-4 pr-11 text-base text-white placeholder:text-emerald-50/40 outline-none ring-0 transition focus:border-emerald-300/50 focus:bg-white/20"
                />
                <button
                  type="button"
                  onClick={onToggleShowPassword}
                  className="absolute inset-y-0 right-3 my-auto h-7 rounded px-2 text-sm text-emerald-50/70 transition hover:text-white"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </label>

            <div className="flex items-center justify-between text-sm text-emerald-50/70">
              <button
                type="button"
                onClick={onToggleRemember}
                className="flex items-center gap-2 transition hover:text-white"
              >
                <span className={`h-4 w-4 rounded border ${values.rememberMe ? 'border-emerald-300 bg-emerald-300' : 'border-emerald-100/40'}`} />
                Remember me
              </button>
              <button type="button" className="transition hover:text-white">
                Forgot password?
              </button>
            </div>

            {errorMessage ? (
              <p className="rounded-lg border border-rose-300/25 bg-rose-400/15 px-3 py-2 text-sm text-rose-100">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-12 w-full rounded-xl bg-emerald-400 text-lg font-semibold text-emerald-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-emerald-200"
            >
              {isSubmitting ? 'Logging in...' : 'Log In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-emerald-50/75">
            Don&apos;t have an account? <button type="button" className="font-semibold text-emerald-300 hover:text-emerald-200">Register Now</button>
          </p>

          <div className="my-7 flex items-center gap-3 text-xs uppercase tracking-[0.22em] text-emerald-50/45">
            <span className="h-px flex-1 bg-white/10" />
            <span>Or continue with</span>
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="h-11 rounded-xl border border-white/15 bg-white/5 text-sm font-medium transition hover:bg-white/10">
              Google
            </button>
            <button type="button" className="h-11 rounded-xl border border-white/15 bg-white/5 text-sm font-medium transition hover:bg-white/10">
              Apple
            </button>
          </div>
        </section>
      </div>

      <p className="pointer-events-none absolute bottom-4 left-0 right-0 text-center text-[11px] tracking-[0.2em] text-emerald-50/35">
        © 2026 ZYNC PLATFORMS INC. ALL RIGHTS RESERVED.
      </p>
    </main>
  );
}
