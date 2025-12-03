'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/auth';
import {
    getProfile,
    updateAccountSettings,
    configure2FA,
    verify2FA,
    updateNotificationPreferences,
} from '@/lib/api/auth-client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Shield, CheckCircle2, XCircle, Mail, Smartphone } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
export default function AccountPage() {
    const { user, setUser } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const [preferredAuthMethod, setPreferredAuthMethod] = useState<'one_time_code' | 'google'>('one_time_code');
    // 2FA State
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFAMethod, setTwoFAMethod] = useState<'email' | 'sms'>('email');
    const [show2FADialog, setShow2FADialog] = useState(false);
    const [showDisable2FADialog, setShowDisable2FADialog] = useState(false);
    const [setup2FAStep, setSetup2FAStep] = useState<'method' | 'verify'>('method');
    const [verificationCode, setVerificationCode] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [is2FAProcessing, setIs2FAProcessing] = useState(false);
    // Notification Preferences State
    const [notificationPrefs, setNotificationPrefs] = useState({
        email: true,
        sms: false,
        budgetAlerts: true,
        expenseUpdates: true,
        householdInvites: true,
    });
    const [isSavingPrefs, setIsSavingPrefs] = useState(false);
    // Fetch profile data on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const response = await getProfile();
                const userData = response.user;
                setPreferredAuthMethod((userData.preferredAuthMethod as 'one_time_code' | 'google') || 'one_time_code');
                setTwoFAEnabled(userData.twoFA?.enabled || false);
                setTwoFAMethod(userData.twoFA?.method || 'email');
                setPhoneNumber(userData.phoneNumber || '');
            } catch (error: any) {
                console.error('Failed to fetch profile:', error);
                toast.error(
                    error.message || 'Failed to load account data');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);
    // Handle auth method change
    const handleAuthMethodChange = async (value: string) => {
        const method = value as 'one_time_code' | 'google';
        setPreferredAuthMethod(method);
        try {
            await updateAccountSettings({
                preferredAuthMethod: method,
           });
            toast.success('Preferred login method updated');
        } catch (error: any) {
            console.error('Failed to update auth method:', error);
            toast.error(error.message || 'Failed to update login method');
        }
    };
    // Start 2FA setup
    const handleEnable2FA = () => {
        setShow2FADialog(true);
        setSetup2FAStep('method');
        setVerificationCode('');
    };
    // Configure 2FA
    const handleConfigure2FA = async () => {
        if (twoFAMethod === 'sms' && !phoneNumber) {
            toast.error('Please enter a phone number for SMS verification');
            return;
        }
        try {
            setIs2FAProcessing(true);
            const response = await configure2FA(
                true,
                twoFAMethod,
                twoFAMethod === 'sms' ? phoneNumber : undefined
            );
            if (response.requiresVerification) {
                setSetup2FAStep('verify');
                toast.error(
                    `A verification code has been sent to your ${twoFAMethod === 'email' ? 'email' : 'phone'}`);
            } else {
                // Should not happen, but handle it
                setTwoFAEnabled(true);
                setShow2FADialog(false);
                toast.success('2FA has been enabled');
            }
        } catch (error: any) {
            console.error('Failed to configure 2FA:', error);
            toast.error(
                error.message || 'Failed to setup 2FA');
        } finally {
            setIs2FAProcessing(false);
        }
    };
    // Verify 2FA code
    const handleVerify2FA = async () => {
        if (!verificationCode) {
            toast.error('Please enter the verification code');
            return;
        }
        try {
            setIs2FAProcessing(true);
            await verify2FA(verificationCode);
            setTwoFAEnabled(true);
            setShow2FADialog(false);
            toast.success('2FA has been successfully enabled');
            // Refresh profile to get updated 2FA status
            const response = await getProfile();
            if (response.user) {
                setUser(response.user);
            }
        } catch (error: any) {
            console.error('Failed to verify 2FA:', error);
            toast.error(
                error.message || 'Invalid verification code');
        } finally {
            setIs2FAProcessing(false);
        }
    };
    // Disable 2FA
    const handleDisable2FA = async () => {
        try {
            setIs2FAProcessing(true);
            await configure2FA(false, twoFAMethod);
            setTwoFAEnabled(false);
            setShowDisable2FADialog(false);
            toast.success('2FA has been disabled');
            // Refresh profile
            const response = await getProfile();
            if (response.user) {
                setUser(response.user);
            }
        } catch (error: any) {
            console.error('Failed to disable 2FA:', error);
            toast.error(
                error.message || 'Failed to disable 2FA');
        } finally {
            setIs2FAProcessing(false);
        }
    };
    // Save notification preferences
    const handleSavePreferences = async () => {
        try {
            setIsSavingPrefs(true);
            // Note: Backend may not have all these options yet
            // For now, we'll just save what we can
            await updateNotificationPreferences({
                preferredLoginMethod: notificationPrefs.email ? 'email' : 'sms',
                twoFAMethod: twoFAMethod,
           });
            toast.success('Notification preferences updated');
        } catch (error: any) {
            console.error('Failed to save preferences:', error);
            toast.error(
                error.message || 'Failed to save preferences');
        } finally {
            setIsSavingPrefs(false);
        }
    };
    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-32 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            {/* Authentication Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle>Authentication Preferences</CardTitle>
                    <CardDescription>
                        Choose your preferred login method
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup value={preferredAuthMethod} onValueChange={handleAuthMethodChange}>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="one_time_code" id="one_time_code" />
                            <Label htmlFor="one_time_code" className="cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    <span>One-Time Code (Email)</span>
                                </div>
                            </Label>
                        </div>
                        <div className="flex items-center space-x-2 mt-3">
                            <RadioGroupItem value="google" id="google" />
                            <Label htmlFor="google" className="cursor-pointer">
                                <div className="flex items-center gap-2">
                                    <svg className="h-4 w-4" viewBox="0 0 24 24">
                                        <path
                                            fill="currentColor"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="currentColor"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    <span>Google OAuth</span>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>
                </CardContent>
            </Card>
            {/* Two-Factor Authentication */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="h-5 w-5" />
                                Two-Factor Authentication
                            </CardTitle>
                            <CardDescription>
                                Add an extra layer of security to your account
                            </CardDescription>
                        </div>
                        <Badge variant={twoFAEnabled ? 'default' : 'secondary'} className="gap-1">
                            {twoFAEnabled ? (
                                <>
                                    <CheckCircle2 className="h-3 w-3" />
                                    Enabled
                                </>
                            ) : (
                                <>
                                    <XCircle className="h-3 w-3" />
                                    Disabled
                                </>
                            )}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        {twoFAEnabled
                            ? `2FA is currently enabled via ${twoFAMethod === 'email' ? 'Email' : 'SMS'}. Each time you log in, you'll need to enter a verification code.`
                            : 'Enable 2FA to require a verification code in addition to your password when signing in.'}
                    </p>
                    <div className="flex gap-3">
                        {!twoFAEnabled ? (
                            <Button onClick={handleEnable2FA}>
                                Enable 2FA
                            </Button>
                        ) : (
                            <Button
                                variant="destructive"
                                onClick={() => setShowDisable2FADialog(true)}
                            >
                                Disable 2FA
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
            {/* Trusted Devices - Placeholder */}
            <Card>
                <CardHeader>
                    <CardTitle>Trusted Devices</CardTitle>
                    <CardDescription>
                        Manage devices you've marked as trusted
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                        <p className="text-sm">Coming Soon</p>
                        <p className="text-xs mt-1">Device management will be available in a future update</p>
                    </div>
                </CardContent>
            </Card>
            {/* Notification Preferences */}
            <Card>
                <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>
                        Choose how you want to receive notifications
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-4">
                        <div className="font-medium text-sm">Notification Channels</div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="email-notif"
                                    checked={notificationPrefs.email}
                                    onCheckedChange={(checked) =>
                                        setNotificationPrefs((prev) => ({ ...prev, email: checked as boolean }))
                                    }
                                />
                                <Label htmlFor="email-notif" className="cursor-pointer">
                                    Email notifications
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="sms-notif"
                                    checked={notificationPrefs.sms}
                                    onCheckedChange={(checked) =>
                                        setNotificationPrefs((prev) => ({ ...prev, sms: checked as boolean }))
                                    }
                                    disabled={!phoneNumber}
                                />
                                <Label
                                    htmlFor="sms-notif"
                                    className={!phoneNumber ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                >
                                    SMS notifications {!phoneNumber && '(Add phone number in Profile)'}
                                </Label>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="font-medium text-sm">Alert Types</div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="budget-alerts"
                                    checked={notificationPrefs.budgetAlerts}
                                    onCheckedChange={(checked) =>
                                        setNotificationPrefs((prev) => ({ ...prev, budgetAlerts: checked as boolean }))
                                    }
                                />
                                <Label htmlFor="budget-alerts" className="cursor-pointer">
                                    Budget alerts (when approaching limits)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="expense-updates"
                                    checked={notificationPrefs.expenseUpdates}
                                    onCheckedChange={(checked) =>
                                        setNotificationPrefs((prev) => ({ ...prev, expenseUpdates: checked as boolean }))
                                    }
                                />
                                <Label htmlFor="expense-updates" className="cursor-pointer">
                                    Expense updates (new expenses in your household)
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="household-invites"
                                    checked={notificationPrefs.householdInvites}
                                    onCheckedChange={(checked) =>
                                        setNotificationPrefs((prev) => ({ ...prev, householdInvites: checked as boolean }))
                                    }
                                />
                                <Label htmlFor="household-invites" className="cursor-pointer">
                                    Household invites and member updates
                                </Label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSavePreferences} disabled={isSavingPrefs}>
                            {isSavingPrefs && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Preferences
                        </Button>
                    </div>
                </CardContent>
            </Card>
            {/* 2FA Setup Dialog */}
            <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
                        <DialogDescription>
                            {setup2FAStep === 'method'
                                ? 'Choose how you want to receive your verification codes'
                                : 'Enter the verification code sent to you'}
                        </DialogDescription>
                    </DialogHeader>
                    {setup2FAStep === 'method' ? (
                        <div className="space-y-4 py-4">
                            <RadioGroup value={twoFAMethod} onValueChange={(val) => setTwoFAMethod(val as 'email' | 'sms')}>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="email" id="email-2fa" />
                                    <Label htmlFor="email-2fa" className="cursor-pointer">
                                        Email verification
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="sms" id="sms-2fa" />
                                    <Label htmlFor="sms-2fa" className="cursor-pointer">
                                        SMS verification
                                    </Label>
                                </div>
                            </RadioGroup>
                            {twoFAMethod === 'sms' && (
                                <div className="space-y-2">
                                    <Label htmlFor="phone-2fa">Phone Number</Label>
                                    <Input
                                        id="phone-2fa"
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        placeholder="+1 (555) 123-4567"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="verify-code">Verification Code</Label>
                                <Input
                                    id="verify-code"
                                    type="text"
                                    value={verificationCode}
                                    onChange={(e) => setVerificationCode(e.target.value)}
                                    placeholder="Enter 6-digit code"
                                    maxLength={6}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShow2FADialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={setup2FAStep === 'method' ? handleConfigure2FA : handleVerify2FA}
                            disabled={is2FAProcessing}
                        >
                            {is2FAProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {setup2FAStep === 'method' ? 'Continue' : 'Verify'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Disable 2FA Confirmation Dialog */}
            <AlertDialog open={showDisable2FADialog} onOpenChange={setShowDisable2FADialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will make your account less secure. You will no longer need a verification code when logging in.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDisable2FA}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {is2FAProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Disable 2FA
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
