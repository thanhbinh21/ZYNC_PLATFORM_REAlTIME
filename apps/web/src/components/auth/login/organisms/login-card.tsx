import type { LoginScreenProps } from '../login.types';
import { FormField } from '../atoms/form-field';
import { PrimaryButton } from '../atoms/primary-button';
import { SocialButton } from '../atoms/social-button';

interface LoginCardProps extends Pick<
  LoginScreenProps,
  | 'mode'
  | 'step'
  | 'isRecoveryFlow'
  | 'values'
  | 'isSubmitting'
  | 'infoMessage'
  | 'errorMessage'
  | 'currentUserName'
  | 'onModeChange'
  | 'onStartRecovery'
  | 'onCancelRecovery'
  | 'onIdentifierChange'
  | 'onUsernameChange'
  | 'onDisplayNameChange'
  | 'onPasswordChange'
  | 'onOtpChange'
  | 'onRequestOtp'
  | 'onVerifyOtp'
  | 'onGoogleLogin'
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
  const isLogin = mode === 'login';
  const isPasswordOtpLogin = isLogin && !isRecoveryFlow;

  const submitLabel = isVerifyStep
    ? isRecoveryFlow
      ? 'Đặt lại mật khẩu'
      : 'Xác thực OTP'
    : isRegister
      ? 'Gửi OTP đăng ký'
      : isRecoveryFlow
        ? 'Gửi OTP khôi phục'
        : 'Gửi OTP đăng nhập';

  const onSubmit = async () => {
    if (isVerifyStep) {
      await onVerifyOtp();
      return;
    }
    await onRequestOtp();
  };

  return (
    <section className="zync-soft-card zync-soft-card-elevated relative z-10 w-full max-w-[332px] rounded-[28px] p-8 sm:max-w-[430px] sm:p-9">
      <h2 className="font-ui-title max-w-[12ch] text-balance text-[clamp(2.6rem,4.2vw,4.1rem)] font-semibold leading-[1.03] tracking-[-0.008em] text-text-primary">{title}</h2>
      <p className="font-ui-content mt-3 max-w-[32ch] text-balance text-[clamp(0.95rem,1.35vw,1.25rem)] leading-[1.45] text-text-secondary">{subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-2 rounded-2xl border border-border-light bg-bg-hover p-1.5">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className={`font-ui-title h-9 rounded-lg text-sm font-semibold transition ${
            mode === 'login' ? 'bg-text-primary text-white shadow-sm' : 'text-text-secondary hover:bg-white/70 hover:text-text-primary'
          }`}
        >
          {loginTabLabel}
        </button>
        <button
          type="button"
          onClick={() => onModeChange('register')}
          className={`font-ui-title h-9 rounded-lg text-sm font-semibold transition ${
            mode === 'register' ? 'bg-text-primary text-white shadow-sm' : 'text-text-secondary hover:bg-white/70 hover:text-text-primary'
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
          label="Email đăng nhập"
          type="text"
          placeholder="Nhập email đã đăng ký"
          value={values.identifier}
          disabled={isVerifyStep}
          onChange={onIdentifierChange}
        />

        {isRegister && !isVerifyStep ? (
          <FormField
            label="@Username"
            type="text"
            placeholder="Ví dụ: zync.user"
            value={values.username}
            onChange={onUsernameChange}
          />
        ) : null}

        {(isRegister || isPasswordOtpLogin || isRecoveryFlow) ? (
          <FormField
            label={isRecoveryFlow && isVerifyStep ? 'Mật khẩu mới' : 'Mật khẩu'}
            type="password"
            placeholder="Tối thiểu 8 ký tự"
            value={values.password}
            onChange={onPasswordChange}
          />
        ) : null}

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
                className="text-[11px] font-medium text-accent transition hover:text-accent-strong"
              >
                {isRecoveryFlow ? 'Hủy khôi phục' : 'Đổi thông tin'}
              </button>
            }
          />
        ) : null}

        {isLogin && !isVerifyStep ? (
          <button
            type="button"
            onClick={isRecoveryFlow ? onCancelRecovery : onStartRecovery}
            className="font-ui-content text-sm text-text-secondary transition hover:text-text-primary"
          >
            {isRecoveryFlow ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}
          </button>
        ) : null}

        {infoMessage ? (
          <p className="font-ui-content rounded-lg border border-border-light bg-accent-light px-3 py-2 text-sm text-text-primary">{infoMessage}</p>
        ) : null}

        {errorMessage ? (
          <p className="font-ui-content rounded-lg border border-danger-border bg-danger-bg px-3 py-2 text-sm text-danger-text">{errorMessage}</p>
        ) : null}

        <PrimaryButton isSubmitting={isSubmitting} label={submitLabel} />

        {currentUserName ? (
          <div className="space-y-3 rounded-2xl border border-border-light bg-bg-hover p-3">
            <p className="font-ui-content text-sm text-text-primary">Đang đăng nhập với tài khoản: <span className="font-ui-title font-semibold text-accent-strong">{currentUserName}</span></p>
            <button
              type="button"
              onClick={() => {
                void onLogout();
              }}
              className="font-ui-title h-9 w-full rounded-lg border border-border-light text-sm font-semibold text-text-primary transition hover:bg-white/70"
            >
              Đăng xuất
            </button>
          </div>
        ) : null}
      </form>

      <div className="font-ui-meta my-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-text-tertiary">
        <span className="h-px flex-1 bg-border-light" />
        <span>{socialTitle}</span>
        <span className="h-px flex-1 bg-border-light" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SocialButton
          label="Google"
          onClick={onGoogleLogin}
          disabled={isSubmitting}
        />
        <SocialButton label="Apple" disabled />
      </div>

      <p className="font-ui-content mt-8 text-center text-sm text-text-secondary">
        {isRegister ? loginHint : registerHint}{' '}
        <button
          type="button"
          onClick={() => onModeChange(isRegister ? 'login' : 'register')}
          className="font-ui-title font-semibold text-accent transition hover:text-accent-strong"
        >
          {isRegister ? loginHintAction : registerHintAction}
        </button>
      </p>
    </section>
  );
}
