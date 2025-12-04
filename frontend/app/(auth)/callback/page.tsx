'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { Loader2 } from 'lucide-react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, setTempToken, setRequiresTwoFactor } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    const verify = searchParams.get('verify');
    const provider = searchParams.get('provider');
    const isNewUser = searchParams.get('isNewUser');

    if (!token) {
      router.push('/login');
      return;
    }

    // Check if 2FA verification is required
    if (verify === 'true') {
      setTempToken(token);
      setRequiresTwoFactor(true, 'email');
      router.push('/verify-2fa');
      return;
    }

    // Store isNewUser flag if present
    if (isNewUser === 'true') {
      sessionStorage.setItem('is_new_user', 'true');
    }

    // Store provider for toast message
    if (provider) {
      sessionStorage.setItem('auth_provider', provider);
    }

    // For successful authentication without 2FA, we need to get the user profile
    // Set the token and let the auth check handle the rest
    useAuthStore.getState().setToken(token);
    useAuthStore.getState().checkAuth().then(() => {
      router.push('/expense');
    });
  }, [searchParams, router, login, setTempToken, setRequiresTwoFactor]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
