export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length > 1) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

export const FONT_CLASS_MAP: Record<string, string> = {
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

/**
 * Format a timestamp into a human-readable relative time string (Vietnamese).
 */
export function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

/**
 * Get a rich gradient string for text story backgrounds.
 */
export function getStoryGradient(baseColor: string): string {
  return `linear-gradient(145deg, ${baseColor}, ${baseColor}dd, ${baseColor}88)`;
}

/**
 * Detect swipe direction from touch coordinates.
 */
export function detectSwipeDirection(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  threshold = 50,
): 'left' | 'right' | 'up' | 'down' | null {
  const dx = endX - startX;
  const dy = endY - startY;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDx < threshold && absDy < threshold) return null;

  if (absDx > absDy) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

/**
 * Clamp a number between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/* ─── Media Preloading ─── */

const preloadedUrls = new Set<string>();

/**
 * Preload a media resource (image or video) for instant display.
 * Uses <link> for images and silent <video> for video.
 */
export function preloadMedia(url: string, type: 'image' | 'video'): Promise<void> {
  if (!url || preloadedUrls.has(url)) return Promise.resolve();

  return new Promise<void>((resolve) => {
    preloadedUrls.add(url);

    if (type === 'image') {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve(); // don't block on error
      img.src = url;
    } else {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.muted = true;
      video.oncanplaythrough = () => resolve();
      video.onerror = () => resolve();
      video.src = url;
      video.load();
    }
  });
}

/**
 * Check if a media URL has been preloaded.
 */
export function isMediaCached(url: string): boolean {
  return preloadedUrls.has(url);
}

/**
 * Format a view count into a compact display string.
 */
export function formatViewCount(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 1_000_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
}

/**
 * Check if the user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
