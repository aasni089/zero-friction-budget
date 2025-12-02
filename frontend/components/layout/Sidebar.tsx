'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Wallet,
  ChevronLeft,
  Users,
  ChevronDown,
  Settings,
  User,
  LogOut,
  Plus,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUiStore } from '@/lib/stores/ui';
import { useAuthStore } from '@/lib/stores/auth';
import { cn } from '@/lib/utils';
import type { Household } from '@/lib/api/household-client';
import { CreateHouseholdDialog } from '@/components/household/CreateHouseholdDialog';

const navigation = [
  { name: 'Expense', href: '/expense', icon: Home },
  { name: 'Track', href: '/track', icon: BarChart3 },
  { name: 'Budgets', href: '/budgets', icon: Wallet },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    sidebarCollapsed,
    toggleSidebar,
    setSidebarOpen,
    currentHouseholdId,
    setCurrentHouseholdId,
    households,
    getCurrentHousehold,
  } = useUiStore();

  const [isCreateHouseholdOpen, setIsCreateHouseholdOpen] = useState(false);

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

  // Handle household selection
  const handleHouseholdChange = (householdId: string) => {
    setCurrentHouseholdId(householdId);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Navigate to profile
  const handleProfileClick = () => {
    setSidebarOpen(false);
    router.push('/settings/profile');
  };

  // Navigate to settings
  const handleSettingsClick = () => {
    setSidebarOpen(false);
    router.push('/settings');
  };

  // Open create household dialog
  const handleCreateHousehold = () => {
    setSidebarOpen(false);
    setIsCreateHouseholdOpen(true);
  };

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'h-screen flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
          sidebarCollapsed ? 'w-20' : 'w-64',
          className
        )}
      >
        {/* Logo Section */}
        <div className="p-4 border-b border-sidebar-border">
          <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'justify-start')}>
            <div className="text-3xl">💰</div>
            {!sidebarCollapsed && (
              <span className="ml-2 text-lg font-bold text-sidebar-foreground">Budget</span>
            )}
          </div>
        </div>

        {/* Household Selector / Create Button */}
        {!sidebarCollapsed && households.length > 0 && (
          <div className="p-4 border-b border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between h-auto py-2 bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-sidebar-border"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <Users className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate text-sm">
                      {currentHousehold?.name || 'Select Household'}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 flex-shrink-0 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>Switch Household</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {households.map((household) => (
                  <DropdownMenuItem
                    key={household.id}
                    onClick={() => handleHouseholdChange(household.id)}
                    className={cn(
                      currentHouseholdId === household.id && 'bg-sidebar-accent text-sidebar-accent-foreground'
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{household.name}</span>
                      {household._count && (
                        <span className="text-xs text-muted-foreground">
                          {household._count.members} member
                          {household._count.members !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleCreateHousehold}>
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Create Household</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* No Household - Create Button */}
        {!sidebarCollapsed && households.length === 0 && (
          <div className="p-4 border-b border-sidebar-border">
            <Button
              onClick={handleCreateHousehold}
              className="w-full"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Household
            </Button>
          </div>
        )}

        {/* Collapsed household indicator */}
        {sidebarCollapsed && (
          <div className="px-4 py-2 border-b border-sidebar-border flex justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                  {households.length > 0 ? (
                    <Users className="h-5 w-5" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="right">
                {households.length > 0 ? (
                  <>
                    <DropdownMenuLabel>Switch Household</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {households.map((household) => (
                      <DropdownMenuItem
                        key={household.id}
                        onClick={() => handleHouseholdChange(household.id)}
                        className={cn(
                          currentHouseholdId === household.id && 'bg-sidebar-accent text-sidebar-accent-foreground'
                        )}
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{household.name}</span>
                          {household._count && (
                            <span className="text-xs text-muted-foreground">
                              {household._count.members} member
                              {household._count.members !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCreateHousehold}>
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Create Household</span>
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuLabel>No Household</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleCreateHousehold}>
                      <Plus className="h-4 w-4 mr-2" />
                      <span>Create Household</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            const linkElement = (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  sidebarCollapsed ? 'justify-center' : 'justify-start'
                )}
              >
                <Icon className={cn('h-5 w-5', !sidebarCollapsed && 'mr-3')} />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );

            // Wrap with tooltip when collapsed
            if (sidebarCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    {linkElement}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return linkElement;
          })}
        </nav>

        {/* Footer - User Profile with Collapse Button */}
        <div className="p-4 border-t border-sidebar-border">
          <div className={cn('flex items-center', sidebarCollapsed ? 'justify-center' : 'justify-between')}>
            {/* User Profile with Dropdown */}
            {!sidebarCollapsed && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-3 hover:bg-sidebar-accent rounded-lg p-2 transition-colors flex-1 min-w-0 text-sidebar-foreground">
                    <Avatar className="h-9 w-9 flex-shrink-0">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold truncate">
                        {user.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start" side="top">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
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
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Collapsed state avatar */}
            {sidebarCollapsed && user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold text-sm">
                        {getUserInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="start" side="right">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.name}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
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
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Collapse Button - Hidden on mobile */}
            {!sidebarCollapsed && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleSidebar}
                className="hidden lg:flex h-9 w-9 flex-shrink-0 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <div className="flex items-center -space-x-2.5">
                  <ChevronLeft className="h-4 w-4" />
                  <ChevronLeft className="h-4 w-4" />
                </div>
              </Button>
            )}
          </div>

          {/* Expand Button when collapsed - Hidden on mobile */}
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              className="hidden lg:flex h-9 w-9 mt-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className="flex items-center -space-x-2.5">
                <ChevronLeft className="h-4 w-4 rotate-180" />
                <ChevronLeft className="h-4 w-4 rotate-180" />
              </div>
            </Button>
          )}
        </div>
      </aside>

      {/* Create Household Dialog */}
      <CreateHouseholdDialog
        open={isCreateHouseholdOpen}
        onOpenChange={setIsCreateHouseholdOpen}
      />
    </TooltipProvider>
  );
}
