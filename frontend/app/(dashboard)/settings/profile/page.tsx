'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth';
import { getProfile, updateAccountSettings } from '@/lib/api/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Upload } from 'lucide-react';

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
    });

    const [errors, setErrors] = useState<{
        name?: string;
        phoneNumber?: string;
    }>({});

    // Fetch profile data on mount
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                setIsLoading(true);
                const response = await getProfile();
                const userData = response.user;

                setFormData({
                    name: userData.name || '',
                    email: userData.email || '',
                    phoneNumber: userData.phoneNumber || '',
                });
            } catch (error: any) {
                console.error('Failed to fetch profile:', error);
                toast.error(error.message || 'Failed to load profile data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchProfile();
    }, [toast]);

    // Validate form
    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (formData.phoneNumber && !/^\+?[\d\s\-()]+$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Invalid phone number format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            setIsSaving(true);

            const response = await updateAccountSettings({
                name: formData.name,
                phoneNumber: formData.phoneNumber || undefined,
            });

            // Update auth store with new user data
            if (response.user) {
                setUser(response.user);
            }

            toast.success('Your profile has been updated');
        } catch (error: any) {
            console.error('Failed to update profile:', error);
            toast.error(error.message || 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle input changes
    const handleChange = (field: keyof typeof formData) => (
        e: React.ChangeEvent<HTMLInputElement>
    ) => {
        setFormData((prev) => ({
            ...prev,
            [field]: e.target.value,
        }));
        // Clear error for this field when user starts typing
        if (errors[field as keyof typeof errors]) {
            setErrors((prev) => ({
                ...prev,
                [field]: undefined,
            }));
        }
    };

    // Get user initials for avatar
    const getInitials = (name: string) => {
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                        Update your personal information and profile settings
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Avatar Section */}
                        <div className="flex items-center gap-6">
                            <Avatar className="h-24 w-24">
                                <AvatarImage src={user?.image} />
                                <AvatarFallback className="text-2xl">
                                    {formData.name ? getInitials(formData.name) : 'U'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled
                                    className="cursor-not-allowed"
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    Upload Photo
                                </Button>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Avatar upload coming soon
                                </p>
                            </div>
                        </div>

                        {/* Name Field */}
                        <div className="space-y-2">
                            <Label htmlFor="name">
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                type="text"
                                value={formData.name}
                                onChange={handleChange('name')}
                                placeholder="Enter your full name"
                                className={errors.name ? 'border-destructive' : ''}
                            />
                            {errors.name && (
                                <p className="text-sm text-destructive">{errors.name}</p>
                            )}
                        </div>

                        {/* Email Field (Read-only) */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                disabled
                                className="bg-muted cursor-not-allowed"
                            />
                            <p className="text-sm text-muted-foreground">
                                Email cannot be changed
                            </p>
                        </div>

                        {/* Phone Number Field */}
                        <div className="space-y-2">
                            <Label htmlFor="phoneNumber">Phone Number</Label>
                            <Input
                                id="phoneNumber"
                                type="tel"
                                value={formData.phoneNumber}
                                onChange={handleChange('phoneNumber')}
                                placeholder="+1 (555) 123-4567"
                                className={errors.phoneNumber ? 'border-destructive' : ''}
                            />
                            {errors.phoneNumber && (
                                <p className="text-sm text-destructive">{errors.phoneNumber}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                                Used for SMS notifications and 2FA
                            </p>
                        </div>

                        {/* Submit Button */}
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
