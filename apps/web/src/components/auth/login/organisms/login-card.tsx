import type { LoginScreenProps } from '../login.types';
import { FormField } from '../atoms/form-field';
import { PrimaryButton } from '../atoms/primary-button';
import { SocialButton } from '../atoms/social-button';

interface LoginCardProps extends Pick<
  LoginScreenProps,
  | 'mode'
  | 'step'
  | 'values'
  | 'isSubmitting'
  | 'infoMessage'
  | 'errorMessage'
  | 'currentUserName'
  | 'onModeChange'
  | 'onIdentifierChange'
  | 'onDisplayNameChange'
  | 'onOtpChange'
  | 'onRequestOtp'
  | 'onVerifyOtp'
  | 'onBackToInput'
  | 'onLogout'
> {
  title: string;
  subtitle: string;
  loginTabLabel: string;
  registerTabLabel: string;
  socialTitle: string;
  registerHint: string;
  loginHint: string;
  loginHintAction: string;
  registerHintAction: string;
}

export function LoginCard({
  title,
  subtitle,
  mode,
  step,
  values,
  isSubmitting,
  infoMessage,
  errorMessage,
  currentUserName,
  onModeChange,
  onIdentifierChange,
  onDisplayNameChange,
  onOtpChange,
  onRequestOtp,
  onVerifyOtp,
  onBackToInput,
  onLogout,
  loginTabLabel,
  registerTabLabel,
  socialTitle,
  registerHint,
  loginHint,
  loginHintAction,
  registerHintAction,
}: LoginCardProps) {
  const isRegister = mode === 'register';
  const isVerifyStep = step === 'verify';

  const submitLabel = isVerifyStep
    ? 'Xác thực OTP'
    : isRegister
      ? 'Gửi OTP đăng ký'
      : 'Gửi OTP đăng nhập';

  const onSubmit = async () => {
    if (isVerifyStep) {
      await onVerifyOtp();
      return;
    }
    await onRequestOtp();
  };

  return (
    <section className="relative z-10 w-full max-w-[332px] rounded-[28px] border border-[#16513f] bg-[linear-gradient(160deg,rgba(12,68,54,0.92),rgba(8,52,42,0.92))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:max-w-[430px] sm:p-9">
      <h2 className="font-ui-title max-w-[12ch] text-balance text-[clamp(2.6rem,4.2vw,4.1rem)] font-semibold leading-[1.03] tracking-[-0.008em] text-[#d6eee6]">{title}</h2>
      <p className="font-ui-content mt-3 max-w-[32ch] text-balance text-[clamp(0.95rem,1.35vw,1.25rem)] leading-[1.35] text-[#9ec0b5]">{subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl border border-[#185343] bg-[#08362d] p-1">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className={`font-ui-title h-9 rounded-lg text-sm font-semibold transition ${
            mode === 'login' ? 'bg-[#2dc99b] text-[#063026]' : 'text-[#9cc1b5] hover:bg-[#0d4a3c]'
          }`}
        >
          {loginTabLabel}
        </button>
        <button
          type="button"
          onClick={() => onModeChange('register')}
          className={`font-ui-title h-9 rounded-lg text-sm font-semibold transition ${
            mode === 'register' ? 'bg-[#2dc99b] text-[#063026]' : 'text-[#9cc1b5] hover:bg-[#0d4a3c]'
          }`}
        >
          {registerTabLabel}
        </button>
      </div>

      <form
        className="mt-7 space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <FormField
          label="Số điện thoại hoặc email"
          type="text"
          placeholder="Nhập số điện thoại hoặc email"
          value={values.identifier}
          onChange={onIdentifierChange}
        />

        {isRegister && !isVerifyStep ? (
          <FormField
            label="Tên hiển thị"
            type="text"
            placeholder="Nhập tên hiển thị"
            value={values.displayName}
            onChange={onDisplayNameChange}
          />
        ) : null}

        {isVerifyStep ? (
          <FormField
            label="Mã OTP"
            type="text"
            placeholder="Nhập 6 chữ số OTP"
            value={values.otp}
            onChange={onOtpChange}
            rightNode={
              <button
                type="button"
                onClick={onBackToInput}
                className="text-[11px] font-medium text-[#57d9ad] transition hover:text-[#9ef0d1]"
              >
                Đổi thông tin
              </button>
            }
          />
        ) : null}

        {infoMessage ? (
          <p className="font-ui-content rounded-lg border border-[#3a876d] bg-[#154335]/60 px-3 py-2 text-sm text-[#c8f3e2]">{infoMessage}</p>
        ) : null}

        {errorMessage ? (
          <p className="font-ui-content rounded-lg border border-[#b75662] bg-[#601e29]/55 px-3 py-2 text-sm text-[#ffcccf]">{errorMessage}</p>
        ) : null}

        <PrimaryButton isSubmitting={isSubmitting} label={submitLabel} />

        {currentUserName ? (
          <div className="space-y-3 rounded-lg border border-[#2f745f] bg-[#0d3d31]/70 p-3">
            <p className="font-ui-content text-sm text-[#c0ebde]">Đang đăng nhập với tài khoản: <span className="font-ui-title font-semibold">{currentUserName}</span></p>
            <button
              type="button"
              onClick={() => {
                void onLogout();
              }}
              className="font-ui-title h-9 w-full rounded-lg border border-[#2f8f73] text-sm font-semibold text-[#a7dccc] transition hover:bg-[#125141]"
            >
              Đăng xuất
            </button>
          </div>
        ) : null}
      </form>

      <div className="font-ui-meta my-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6f988b]">
        <span className="h-px flex-1 bg-[#205647]" />
        <span>{socialTitle}</span>
        <span className="h-px flex-1 bg-[#205647]" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SocialButton label="Google" />
        <SocialButton label="Apple" />
      </div>

      <p className="font-ui-content mt-8 text-center text-sm text-[#8fb6aa]">
        {isRegister ? loginHint : registerHint}{' '}
        <button
          type="button"
          onClick={() => onModeChange(isRegister ? 'login' : 'register')}
          className="font-ui-title font-semibold text-[#57d9ad] transition hover:text-[#b6ffdf]"
        >
          {isRegister ? loginHintAction : registerHintAction}
        </button>
      </p>
    </section>
  );
}
