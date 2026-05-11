'use client';

import { Suspense } from 'react';
import CommunityContent from './community-content';
import { PageLoading } from '@/components/shared/page-loading';
import { ZyncPageTransition } from '@/components/shared/ZyncPageTransition';

export default function CommunityPage() {
  return (
    <Suspense fallback={<PageLoading variant="community" mode="panel" />}>
      <ZyncPageTransition>
        <CommunityContent />
      </ZyncPageTransition>
    </Suspense>
  );
}
