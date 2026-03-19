import type { LoginScreenMockData } from './login.types';

export const LOGIN_SCREEN_MOCK_DATA: LoginScreenMockData = {
  brand: 'ZYNC',
  headline: ['Connect with', 'the world.'],
  subtitle: [
    'Step into the Emerald Conservatory.',
    'Experience a messaging sanctuary designed',
    'for focused, high-fidelity communication.',
  ],
  members: [
    { id: '1', name: 'An', initials: 'AN', tone: 'bg-[#d7b498]' },
    { id: '2', name: 'Binh', initials: 'BI', tone: 'bg-[#9eb8d4]' },
    { id: '3', name: 'Chi', initials: 'CH', tone: 'bg-[#8ca67f]' },
  ],
  extraMembersLabel: '+2k',
  bottomCaption: 'Join thousands of global citizens today.',
  cardTitle: 'Welcome Back',
  cardSubtitle: 'Log in to your secure conservatory.',
  footer: {
    copyright: '© 2024 ZYNC Messaging. Built for the Emerald Conservatory.',
    links: ['Privacy Policy', 'Terms of Service', 'Contact'],
    statusLabel: 'Status',
  },
};
