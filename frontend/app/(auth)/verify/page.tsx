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

export default function VerifyPage() {
  const router = useRouter();
  const { login, setTempToken, setRequiresTwoFactor } = useAuthStore();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  useEffect(() => {
    // Get email and message from session storage
    const storedEmail = sessionStorage.getItem('auth_email');
    const storedMessage = sessionStorage.getItem('auth_message');

    if (!storedEmail) {
      router.push('/login');
      return;
    }

    setEmail(storedEmail);
    if (storedMessage) {
      setInfoMessage(storedMessage);
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authClient.verifyLoginCode(email, code, false);

      if (response.requiresTwoFactor && response.tempToken) {
        // 2FA is required
        setTempToken(response.tempToken);
        setRequiresTwoFactor(true, response.twoFAMethod);
        router.push('/verify-2fa');
      } else if (response.token && response.user) {
        // Login successful
        login(response.user, response.token);
        sessionStorage.removeItem('auth_email');
        sessionStorage.removeItem('auth_message');
        sessionStorage.removeItem('is_registration');
        router.push('/dashboard');
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
      await authClient.resendLoginCode(email);
      setSuccessMessage('Verification code sent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const handleCancel = async () => {
    try {
      await authClient.invalidateLoginCode(email);
      sessionStorage.removeItem('auth_email');
      sessionStorage.removeItem('auth_message');
      sessionStorage.removeItem('is_registration');
      router.push('/login');
    } catch (err) {
      // Still navigate even if invalidation fails
      sessionStorage.removeItem('auth_email');
      sessionStorage.removeItem('auth_message');
      sessionStorage.removeItem('is_registration');
      router.push('/login');
    }
  };

  if (!email) {
    return null;
  }

  return (
    <div className="container max-w-md mx-auto py-12">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Check Your Email</h1>
          <p className="text-muted-foreground">
            Enter the verification code sent to <strong>{email}</strong>
          </p>
        </div>

        {infoMessage && (
          <Alert>
            <AlertDescription>{infoMessage}</AlertDescription>
          </Alert>
        )}

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

          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
