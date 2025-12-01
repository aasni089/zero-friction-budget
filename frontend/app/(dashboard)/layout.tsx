'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useAuthStore } from '@/lib/stores/auth';
import { useUiStore } from '@/lib/stores/ui';
import { getHouseholds } from '@/lib/api/household-client';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  // Note: checkAuth is now handled by AuthProvider at root level
  const { isAuthenticated, isLoading: authLoading } = useAuthStore();
  const {
    sidebarCollapsed,
    sidebarOpen,
    setSidebarOpen,
    setHouseholds,
  } = useUiStore();

  const [isLoadingHouseholds, setIsLoadingHouseholds] = useState(false);
  const [householdsError, setHouseholdsError] = useState<string | null>(null);
  const [hasFetchedHouseholds, setHasFetchedHouseholds] = useState(false);

  // Fetch households once after auth check completes
  useEffect(() => {
    const fetchHouseholds = async () => {
      if (!isAuthenticated || hasFetchedHouseholds || authLoading) return;

      try {
        setIsLoadingHouseholds(true);
        setHouseholdsError(null);
        const response = await getHouseholds();
        setHouseholds(response.households || []);
        setHasFetchedHouseholds(true);
      } catch (error: any) {
        console.error('Failed to fetch households:', error);
        setHouseholdsError(
          error?.message || 'Failed to load households. Please try again.'
        );
      } finally {
        setIsLoadingHouseholds(false);
      }
    };

    // Only fetch if authenticated and not loading
    if (isAuthenticated && !authLoading && !hasFetchedHouseholds) {
      fetchHouseholds();
    } else if (!authLoading && !isAuthenticated) {
      // Not authenticated, no need to show households loading
      setIsLoadingHouseholds(false);
    }
  }, [isAuthenticated, authLoading, hasFetchedHouseholds, setHouseholds]);

  // Retry handler for household fetch errors
  const retryFetchHouseholds = async () => {
    setHasFetchedHouseholds(false);
    setHouseholdsError(null);
  };

  // Show loading state while checking auth
  // Note: No client-side redirect needed - middleware handles route protection
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-12 rounded-full mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar (Sheet/Drawer) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar />
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <TopBar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main
          className={cn(
            'flex-1 overflow-auto',
            'transition-all duration-300'
          )}
        >
          {/* Show error if households failed to load */}
          {householdsError && (
            <div className="p-4">
              <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
                <span>{householdsError}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={retryFetchHouseholds}
                  className="ml-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Show loading skeleton while fetching households */}
          {isLoadingHouseholds && (
            <div className="p-6 space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {/* Render children once households are loaded */}
          {!isLoadingHouseholds && children}
        </main>
      </div>
    </div>
  );
}
