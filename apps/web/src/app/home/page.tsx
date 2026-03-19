'use client';

import { HomeDashboardScreen } from '@/components/home-dashboard/organisms/home-dashboard-screen';
import { useHomeDashboard } from '@/hooks/use-home-dashboard';

export default function HomePage() {
  const { data, loading } = useHomeDashboard();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#021612]">
        <div className="text-[#30d7ab] animate-pulse">Đang tải trung tâm điều khiển...</div>
      </div>
    );
  }

  return <HomeDashboardScreen data={data} />;
}
