// Module: auth | Component: LoginScreen | Type: types
// Depends: none
export interface LoginFormValues {
  identifier: string;
  displayName: string;
  otp: string;
}

export type AuthMode = 'login' | 'register';
export type AuthStep = 'input' | 'verify';

export interface CommunityMember {
  id: string;
  name: string;
  initials: string;
  tone: string;
}

export interface LoginScreenMockData {
  brand: string;
  headline: [string, string];
  subtitle: string;
  members: CommunityMember[];
  extraMembersLabel: string;
  bottomCaption: string;
  cardTitle: string;
  cardSubtitle: string;
  loginTabLabel: string;
  registerTabLabel: string;
  socialTitle: string;
  registerHint: string;
  loginHint: string;
  loginHintAction: string;
  registerHintAction: string;
  footer: {
    copyright: string;
    links: string[];
    statusLabel: string;
  };
}

export interface LoginScreenProps {
  mockData: LoginScreenMockData;
  mode: AuthMode;
  step: AuthStep;
  values: LoginFormValues;
  isSubmitting: boolean;
  infoMessage: string | null;
  errorMessage: string | null;
  currentUserName: string | null;
  onModeChange: (mode: AuthMode) => void;
  onIdentifierChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onRequestOtp: () => Promise<void>;
  onVerifyOtp: () => Promise<void>;
  onBackToInput: () => void;
  onLogout: () => Promise<void>;
}
