'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth';
import * as authClient from '@/lib/api/auth-client';

export default function Verify2FAPage() {
  const router = useRouter();
  const { tempToken, twoFAMethod, login } = useAuthStore();
  const [code, setCode] = useState('');
  const [trustDevice, setTrustDevice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Redirect if no temp token
    if (!tempToken) {
      router.push('/login');
    }
  }, [tempToken, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!tempToken) {
      setError('No authentication token found');
      setIsLoading(false);
      return;
    }

    try {
      const response = await authClient.verifyLogin2FA(code, tempToken, trustDevice);

      if (response.token && response.user) {
        // 2FA verification successful
        login(response.user, response.token);
        router.push('/expense');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code');
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setSuccessMessage(null);
    setIsResending(true);

    try {
      const response = await authClient.resend2FACode();
      setSuccessMessage(`Verification code sent via ${response.method}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  if (!tempToken) {
    return null;
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground">
            Enter the verification code sent to your{' '}
            {twoFAMethod === 'sms' ? 'phone' : 'email'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              type="text"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              required
              autoFocus
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="trustDevice"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="trustDevice" className="text-sm font-normal cursor-pointer">
              Trust this device for 30 days
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || code.length !== 6}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </Button>
        </form>

        <div className="flex flex-col space-y-2">
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Resend Code'
            )}
          </Button>

          <Button variant="ghost" onClick={() => router.push('/login')}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
