'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import * as authClient from '@/lib/api/auth-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await authClient.requestLoginCode(
        email,
        isRegistering ? name : undefined
      );

      // Store email and message for verification page
      sessionStorage.setItem('auth_email', email);
      sessionStorage.setItem('auth_message', response.message || '');

      if (response.isRegistration) {
        // New user registration
        sessionStorage.setItem('is_registration', 'true');
      } else {
        // Existing user login
        sessionStorage.removeItem('is_registration');
      }

      router.push('/verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    authClient.initiateGoogleAuth();
  };

  return (
    <div className="container max-w-md mx-auto py-12">
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-muted-foreground">
            {isRegistering
              ? 'Enter your details to create your account'
              : 'Enter your email to receive a verification code'}
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending code...
              </>
            ) : isRegistering ? (
              'Create Account'
            ) : (
              'Send Verification Code'
            )}
          </Button>
        </form>

        <Separator />

        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          Continue with Google
        </Button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-primary hover:underline"
            >
              {isRegistering ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
