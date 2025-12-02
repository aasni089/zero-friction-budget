'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, Shield, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const settingsTabs = [
    {
        name: 'Profile',
        href: '/settings/profile',
        icon: User,
        description: 'Manage your personal information'
    },
    {
        name: 'Account',
        href: '/settings/account',
        icon: Shield,
        description: 'Security and authentication settings'
    },
    {
        name: 'Household',
        href: '/settings/household',
        icon: Home,
        description: 'Manage household members and settings'
    }
];

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-background p-8 animate-in fade-in duration-500">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your account and household preferences
                    </p>
                </div>

                {/* Tabs Navigation */}
                <div className="border-b border-border">
                    <nav className="flex space-x-8" aria-label="Settings tabs">
                        {settingsTabs.map((tab) => {
                            const isActive = pathname.startsWith(tab.href);
                            const Icon = tab.icon;

                            return (
                                <Link
                                    key={tab.name}
                                    href={tab.href}
                                    className={cn(
                                        'group inline-flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors',
                                        isActive
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                    )}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="py-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
