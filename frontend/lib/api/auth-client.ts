// Auth API client for Zero Friction Budget

import { api } from './client';

export interface User {
  id: string;
  email: string;
  name: string;
  phoneNumber?: string;
  image?: string;
  twoFAEnabled?: boolean;
  twoFAVerified?: boolean;
  twoFAMethod?: 'email' | 'sms';
  preferredAuthMethod?: string;
  allowAccountLinking?: boolean;
}

export interface AuthResponse {
  token?: string;
  user?: User;
  tempToken?: string;
  requiresTwoFactor?: boolean;
  twoFAMethod?: 'email' | 'sms';
  deviceToken?: string;
  isNewUser?: boolean;
}

export interface ProfileResponse {
  user: User & {
    authProviders?: string[];
    twoFA?: {
      enabled: boolean;
      method?: 'email' | 'sms';
      verified?: boolean;
    };
  };
}

/**
 * One-Time Code (OTC) Authentication
 */

// Request OTC for login or registration
export async function requestLoginCode(email: string, name?: string) {
  return api.post<{ success: boolean; message: string; isRegistration?: boolean }>(
    '/auth/login-code',
    { email, name }
  );
}

// Verify OTC and authenticate
export async function verifyLoginCode(
  email: string,
  code: string,
  trustDevice?: boolean
) {
  return api.post<AuthResponse>('/auth/verify-login-code', {
    email,
    code,
    trustDevice,
  });
}

// Resend login code
export async function resendLoginCode(email: string) {
  return api.post<{ success: boolean; message: string }>(
    '/auth/resend-login-code',
    { email }
  );
}

// Cancel login attempt
export async function invalidateLoginCode(email: string) {
  return api.post<{ success: boolean; message: string }>(
    '/auth/invalidate-login-code',
    { email }
  );
}

/**
 * Google OAuth
 */

// Redirect to Google OAuth
export function initiateGoogleAuth() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  window.location.href = `${API_URL}/auth/google`;
}

/**
 * Two-Factor Authentication (2FA)
 */

// Verify 2FA code (requires auth token)
export async function verify2FA(code: string, trustDevice?: boolean) {
  return api.post<AuthResponse>('/auth/verify-2fa', {
    code,
    trustDevice,
  });
}

// Verify 2FA during login (uses temp token)
export async function verifyLogin2FA(
  code: string,
  tempToken: string,
  trustDevice?: boolean
) {
  return api.post<AuthResponse>('/auth/verify-login-2fa', {
    code,
    tempToken,
    trustDevice,
  });
}

// Configure 2FA settings
export async function configure2FA(
  enabled: boolean,
  method: 'email' | 'sms',
  phoneNumber?: string
) {
  return api.post<{
    success: boolean;
    user: User;
    requiresVerification?: boolean;
    method?: string;
  }>('/auth/2fa/configure', {
    enabled,
    method,
    phoneNumber,
  });
}

// Resend 2FA code
export async function resend2FACode() {
  return api.post<{
    success: boolean;
    message: string;
    method: 'email' | 'sms';
  }>('/auth/2fa/resend-code');
}

// Cancel 2FA setup
export async function cancel2FASetup() {
  return api.post<{ success: boolean; message: string }>(
    '/auth/2fa/cancel-setup'
  );
}

/**
 * Profile & Account Management
 */

// Get user profile
export async function getProfile() {
  return api.get<ProfileResponse>('/auth/profile');
}

// Logout
export async function logout() {
  return api.post<{ success: boolean }>('/auth/logout');
}

// Update account settings
export async function updateAccountSettings(data: {
  name?: string;
  preferredAuthMethod?: 'one_time_code' | 'google';
  phoneNumber?: string;
}) {
  return api.patch<{ success: boolean; user: User }>(
    '/auth/account-settings',
    data
  );
}

// Update notification preferences
export async function updateNotificationPreferences(data: {
  preferredLoginMethod?: 'email' | 'sms';
  twoFAMethod?: 'email' | 'sms';
  phoneNumber?: string;
}) {
  return api.patch<{ success: boolean; user: User }>(
    '/auth/notification-preferences',
    data
  );
}

// Update account linking preferences
export async function updateLinkingPreferences(allowAccountLinking: boolean) {
  return api.patch<{ success: boolean; allowAccountLinking: boolean }>(
    '/auth/linking-preferences',
    { allowAccountLinking }
  );
}
