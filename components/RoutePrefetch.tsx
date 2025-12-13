'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Prefetches critical routes on component mount for faster navigation
 */
export default function RoutePrefetch() {
  const router = useRouter();

  useEffect(() => {
    // Prefetch critical routes after initial page load
    const prefetchTimeout = setTimeout(() => {
      // Only prefetch if user is likely to navigate (not on mobile with slow connection)
      if (typeof window !== 'undefined' && 'connection' in navigator) {
        const conn = (navigator as any).connection;
        // Skip prefetching on slow connections
        if (conn && (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g')) {
          return;
        }
      }

      // Prefetch most common user flows
      router.prefetch('/');
      router.prefetch('/products');
      router.prefetch('/cart');
      router.prefetch('/orders');
    }, 2000); // Wait 2 seconds after load to avoid blocking initial render

    return () => clearTimeout(prefetchTimeout);
  }, [router]);

  return null; // This component renders nothing
}
