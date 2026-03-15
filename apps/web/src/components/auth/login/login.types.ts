// Module: auth | Component: LoginScreen | Type: types
// Depends: none
export interface LoginFormValues {
  phoneNumber: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginScreenProps {
  values: LoginFormValues;
  isSubmitting: boolean;
  showPassword: boolean;
  errorMessage: string | null;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleRemember: () => void;
  onToggleShowPassword: () => void;
  onSubmit: () => Promise<void>;
}
