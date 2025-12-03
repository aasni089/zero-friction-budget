'use client';

import { useRouter } from 'next/navigation';
import { Menu, LogOut, User, Settings, Plus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/lib/stores/auth';
import { useUiStore } from '@/lib/stores/ui';

interface TopBarProps {
  onMenuClick?: () => void;
}

export function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { getCurrentHousehold } = useUiStore();

  const currentHousehold = getCurrentHousehold();

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const handleProfileClick = () => {
    router.push('/settings/profile');
  };

  const handleSettingsClick = () => {
    router.push('/settings');
  };

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
      {/* Left side - Mobile menu button + Household name */}
      <div className="flex items-center space-x-4">
        {/* Mobile menu button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Current household name */}
        <div className="hidden sm:block">
          <h1 className="text-lg font-semibold text-gray-900">
            {currentHousehold?.name || 'Dashboard'}
          </h1>
        </div>
      </div>

      {/* Right side - Quick actions + User menu */}
      <div className="flex items-center space-x-3">
        {/* Add Expense Button - Desktop */}
        <Button
          onClick={() => router.push('/expense')}
          className="hidden sm:flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          <span>Add Expense</span>
        </Button>

        {/* Add Expense Button - Mobile (Icon Only) */}
        <Button
          onClick={() => router.push('/expense')}
          className="sm:hidden bg-blue-600 hover:bg-blue-700 text-white"
          size="icon"
        >
          <Plus className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user?.image} alt={user?.name || ''} />
                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {user?.name ? getUserInitials(user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user?.name || 'User'}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email || ''}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleProfileClick}>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleSettingsClick}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
