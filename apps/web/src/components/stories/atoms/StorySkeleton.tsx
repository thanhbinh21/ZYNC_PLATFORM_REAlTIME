import type { StorySkeletonProps } from '../stories.types';

export function StorySkeleton({ count = 5, variant = 'bar' }: StorySkeletonProps) {
  if (variant === 'viewer') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-story-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="story-skeleton-base h-14 w-14 rounded-full" />
          <div className="story-skeleton-base h-3 w-28 rounded-full" />
          <div className="story-skeleton-base h-2 w-20 rounded-full" />
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className="flex gap-3">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="story-skeleton-base h-52 w-32 shrink-0 rounded-2xl"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'highlight') {
    return (
      <div className="flex gap-4 overflow-hidden px-2 py-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex shrink-0 flex-col items-center gap-2"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            {/* Cover skeleton */}
            <div className="story-skeleton-base h-[60px] w-[60px] rounded-full" />
            {/* Label skeleton */}
            <div
              className="story-skeleton-base h-2 rounded-full"
              style={{ width: `${32 + Math.random() * 24}px` }}
            />
          </div>
        ))}
      </div>
    );
  }

  // Default: bar variant (horizontal avatar list)
  return (
    <div className="flex gap-4 overflow-hidden px-2 py-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex shrink-0 flex-col items-center gap-2.5"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          {/* Avatar skeleton */}
          <div className="story-skeleton-base h-[72px] w-[72px] rounded-full" />
          {/* Name skeleton */}
          <div
            className="story-skeleton-base h-2.5 rounded-full"
            style={{ width: `${40 + Math.random() * 30}px` }}
          />
        </div>
      ))}
    </div>
  );
}
