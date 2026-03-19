// Module: auth | Component: LoginScreen | Type: types
// Depends: none
export interface LoginFormValues {
  phoneNumber: string;
  password: string;
}

export interface CommunityMember {
  id: string;
  name: string;
  initials: string;
  tone: string;
}

export interface LoginScreenMockData {
  brand: string;
  headline: [string, string];
  subtitle: [string, string, string];
  members: CommunityMember[];
  extraMembersLabel: string;
  bottomCaption: string;
  cardTitle: string;
  cardSubtitle: string;
  footer: {
    copyright: string;
    links: string[];
    statusLabel: string;
  };
}

export interface LoginScreenProps {
  mockData: LoginScreenMockData;
  values: LoginFormValues;
  isSubmitting: boolean;
  showPassword: boolean;
  errorMessage: string | null;
  onPhoneChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onSubmit: () => Promise<void>;
}
