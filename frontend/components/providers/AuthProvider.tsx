'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';

/**
 * AuthProvider - Centralized authentication state initialization
 *
 * This component:
 * 1. Calls checkAuth() ONCE on app mount with error handling
 * 2. Prevents multiple concurrent auth checks
 * 3. Provides a single source of truth for auth initialization
 * 4. Gracefully handles all error scenarios
 *
 * Usage: Wrap the root layout with this provider
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth } = useAuthStore();
  const [hasInitialized, setHasInitialized] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only run once on mount
    if (!hasInitialized) {
      // Wrap in try-catch to prevent unhandled errors from breaking the app
      const initializeAuth = async () => {
        try {
          await checkAuth();
        } catch (error) {
          // Log error but don't throw - let the app continue
          console.error('[AuthProvider] Error during auth initialization:', error);
          // Auth store already handles its own state cleanup on errors
          // No need to do anything else - just prevent the error from bubbling up
        } finally {
          setHasInitialized(true);
        }
      };

      initializeAuth();
    }
  }, [hasInitialized, checkAuth]);

  // Note: We don't show a loading screen here because:
  // 1. The landing page should be visible immediately for unauthenticated users
  // 2. Protected routes are handled by middleware
  // 3. Individual layouts can show loading states if needed

  return <>{children}</>;
}
