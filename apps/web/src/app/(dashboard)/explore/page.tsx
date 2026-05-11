'use client';

import { Suspense } from 'react';
import ExploreContent from './explore-content';
import { PageLoading } from '@/components/shared/page-loading';
import { ZyncPageTransition } from '@/components/shared/ZyncPageTransition';

export default function ExplorePage() {
  return (
    <Suspense fallback={<PageLoading variant="explore" mode="panel" />}>
      <ZyncPageTransition>
        <ExploreContent />
      </ZyncPageTransition>
    </Suspense>
  );
}
