import type { LoginScreenProps } from '../login.types';
import { FormField } from '../atoms/form-field';
import { PrimaryButton } from '../atoms/primary-button';
import { SocialButton } from '../atoms/social-button';

interface LoginCardProps extends Pick<
  LoginScreenProps,
  | 'values'
  | 'isSubmitting'
  | 'showPassword'
  | 'errorMessage'
  | 'onPhoneChange'
  | 'onPasswordChange'
  | 'onToggleShowPassword'
  | 'onSubmit'
> {
  title: string;
  subtitle: string;
}

export function LoginCard({
  title,
  subtitle,
  values,
  isSubmitting,
  showPassword,
  errorMessage,
  onPhoneChange,
  onPasswordChange,
  onToggleShowPassword,
  onSubmit,
}: LoginCardProps) {
  return (
    <section className="relative z-10 w-full max-w-[332px] rounded-[28px] border border-[#16513f] bg-[linear-gradient(160deg,rgba(12,68,54,0.92),rgba(8,52,42,0.92))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:max-w-[390px] sm:p-9">
      <h2 className="text-[42px] font-semibold leading-none text-[#d6eee6]">{title}</h2>
      <p className="mt-3 text-sm text-[#9ec0b5]">{subtitle}</p>

      <form
        className="mt-7 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <FormField
          label="Phone Number"
          type="tel"
          placeholder="+1 (555) 000-0000"
          value={values.phoneNumber}
          onChange={onPhoneChange}
        />

        <FormField
          label="Password"
          type="password"
          showPassword={showPassword}
          placeholder="••••••••"
          value={values.password}
          onChange={onPasswordChange}
          rightNode={
            <button
              type="button"
              onClick={onToggleShowPassword}
              className="text-[11px] font-medium text-[#57d9ad] transition hover:text-[#9ef0d1]"
            >
              Forgot?
            </button>
          }
        />

        {errorMessage ? (
          <p className="rounded-lg border border-[#b75662] bg-[#601e29]/55 px-3 py-2 text-sm text-[#ffcccf]">{errorMessage}</p>
        ) : null}

        <PrimaryButton isSubmitting={isSubmitting} />
      </form>

      <div className="my-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f988b]">
        <span className="h-px flex-1 bg-[#205647]" />
        <span>Or continue with</span>
        <span className="h-px flex-1 bg-[#205647]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SocialButton label="Google" />
        <SocialButton label="Apple" />
      </div>

      <p className="mt-8 text-center text-sm text-[#8fb6aa]">
        Don&apos;t have an account?{' '}
        <button type="button" className="font-semibold text-[#57d9ad] transition hover:text-[#b6ffdf]">
          Get Started
        </button>
      </p>
    </section>
  );
}
