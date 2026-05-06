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
    <section className="zync-glass-panel relative z-10 w-full max-w-[380px] rounded-3xl p-6 sm:max-w-[420px] sm:p-8">
      <h2 className="font-ui-title text-[clamp(1.75rem,3vw,2.25rem)] font-semibold leading-tight tracking-tight text-text-primary">
        {title}
      </h2>
      <p className="font-ui-content mt-2 text-[0.95rem] leading-relaxed text-text-secondary">
        {subtitle}
      </p>

      <div className="mt-6 flex rounded-xl border border-border-light bg-bg-hover p-1">
        <button
          type="button"
          onClick={() => onModeChange('login')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === 'login'
              ? 'bg-surface-card-strong text-text-primary shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {loginTabLabel}
        </button>
        <button
          type="button"
          onClick={() => onModeChange('register')}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
            mode === 'register'
              ? 'bg-surface-card-strong text-text-primary shadow-sm'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          {registerTabLabel}
        </button>
      </div>

      <form
        className="mt-6 space-y-4"
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
                className="text-[11px] font-medium text-text-link transition hover:text-accent-strong"
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
            className="font-ui-content -mt-1 text-sm text-text-link transition hover:text-accent-strong"
          >
            {isRecoveryFlow ? 'Quay lại đăng nhập' : 'Quên mật khẩu?'}
          </button>
        ) : null}

        {infoMessage ? (
          <p className="zync-soft-notice rounded-lg px-4 py-3 text-sm">
            {infoMessage}
          </p>
        ) : null}

        {errorMessage ? (
          <p className="zync-soft-notice-danger rounded-lg px-4 py-3 text-sm">
            {errorMessage}
          </p>
        ) : null}

        <PrimaryButton isSubmitting={isSubmitting} label={submitLabel} />

        {currentUserName ? (
          <div className="space-y-3 rounded-xl border border-border-light bg-bg-hover p-4">
            <p className="font-ui-content text-sm text-text-primary">
              Đang đăng nhập với tài khoản:{' '}
              <span className="font-ui-title font-semibold text-accent-strong">
                {currentUserName}
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                void onLogout();
              }}
              className="zync-soft-button-secondary h-10 w-full rounded-lg text-sm font-semibold"
            >
              Đăng xuất
            </button>
          </div>
        ) : null}
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 border-t border-border-light" />
        <span className="font-ui-meta text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
          {socialTitle}
        </span>
        <span className="h-px flex-1 border-t border-border-light" />
      </div>

      <SocialButton label="Google" onClick={onGoogleLogin} disabled={isSubmitting} />

      <p className="font-ui-content mt-6 text-center text-sm text-text-secondary">
        {isRegister ? loginHint : registerHint}{' '}
        <button
          type="button"
          onClick={() => onModeChange(isRegister ? 'login' : 'register')}
          className="font-semibold text-text-link transition hover:text-accent-strong"
        >
          {isRegister ? loginHintAction : registerHintAction}
        </button>
      </p>
    </section>
  );
}
