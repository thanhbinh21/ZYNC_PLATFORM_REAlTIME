// Module: home | Component: HomePage | Type: container
// Depends: home screen data
'use client';

import { HOME_MOCK_DATA } from '@/components/home/mockData';
import { HomeScreen } from '@/components/home/organisms/home-screen';

export default function HomePage() {
  return <HomeScreen data={HOME_MOCK_DATA} />;
}
