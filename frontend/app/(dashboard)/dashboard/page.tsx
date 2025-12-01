'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/stores/auth';

export default function DashboardTestPage() {
  const router = useRouter();
  // Note: Auth check is now handled by AuthProvider at root level
  const { user, logout, isLoading } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Show loading skeleton while auth is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="space-y-4">
          <Skeleton className="h-12 w-64 bg-gray-800" />
          <Skeleton className="h-4 w-48 bg-gray-800" />
        </div>
      </div>
    );
  }

  // Middleware should handle unauthenticated users, but show a fallback just in case
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <p>Not authenticated. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Authentication Successful!</h1>
          <p className="text-xl text-gray-300">
            Welcome, <span className="text-green-400">{user.name}</span>
          </p>
        </div>

        <div className="bg-gray-900 rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-semibold mb-4">User Information</h2>
          <div className="space-y-2">
            <p>
              <span className="text-gray-400">Email:</span>{' '}
              <span className="text-white">{user.email}</span>
            </p>
            <p>
              <span className="text-gray-400">User ID:</span>{' '}
              <span className="text-white">{user.id}</span>
            </p>
            {user.phoneNumber && (
              <p>
                <span className="text-gray-400">Phone:</span>{' '}
                <span className="text-white">{user.phoneNumber}</span>
              </p>
            )}
            <p>
              <span className="text-gray-400">2FA Enabled:</span>{' '}
              <span className={user.twoFAEnabled ? 'text-green-400' : 'text-gray-400'}>
                {user.twoFAEnabled ? 'Yes' : 'No'}
              </span>
            </p>
            {user.twoFAEnabled && (
              <p>
                <span className="text-gray-400">2FA Method:</span>{' '}
                <span className="text-white">{user.twoFAMethod || 'email'}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <Button
            onClick={handleLogout}
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Logout
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          <p>This is a test page to verify the authentication flow.</p>
          <p>The actual dashboard will be implemented in the next phase.</p>
        </div>
      </div>
    </div>
  );
}
