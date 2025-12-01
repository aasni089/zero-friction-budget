'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Wallet,
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUiStore } from '@/lib/stores/ui';
import { cn } from '@/lib/utils';
import type { Household } from '@/lib/api/household-client';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Budgets', href: '/budgets', icon: Wallet },
  { name: 'Settings', href: '/settings', icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const {
    sidebarCollapsed,
    toggleSidebar,
    currentHouseholdId,
    setCurrentHouseholdId,
    households,
    getCurrentHousehold,
  } = useUiStore();

  const currentHousehold = getCurrentHousehold();

  // Handle household selection
  const handleHouseholdChange = (householdId: string) => {
    setCurrentHouseholdId(householdId);
  };

  return (
    <aside
      className={cn(
        'h-screen flex flex-col bg-white border-r border-gray-200 transition-all duration-300',
        sidebarCollapsed ? 'w-20' : 'w-64',
        className
      )}
    >

      {/* Household Selector */}
      {!sidebarCollapsed && households.length > 0 && (
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-2"
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
                    currentHouseholdId === household.id && 'bg-gray-100'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{household.name}</span>
                    {household._count && (
                      <span className="text-xs text-gray-500">
                        {household._count.members} member
                        {household._count.members !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Collapsed household indicator */}
      {sidebarCollapsed && households.length > 0 && (
        <div className="px-4 py-2 flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Users className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start" side="right">
              <DropdownMenuLabel>Switch Household</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {households.map((household) => (
                <DropdownMenuItem
                  key={household.id}
                  onClick={() => handleHouseholdChange(household.id)}
                  className={cn(
                    currentHouseholdId === household.id && 'bg-gray-100'
                  )}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{household.name}</span>
                    {household._count && (
                      <span className="text-xs text-gray-500">
                        {household._count.members} member
                        {household._count.members !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900',
                sidebarCollapsed ? 'justify-center' : 'justify-start'
              )}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <Icon className={cn('h-5 w-5', !sidebarCollapsed && 'mr-3')} />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer - Collapse/Expand Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          size={sidebarCollapsed ? 'icon' : 'sm'}
          onClick={toggleSidebar}
          className={cn('w-full', sidebarCollapsed && 'h-10')}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5 mr-2" />
              <span>Collapse</span>
            </>
          )}
        </Button>
      </div>
    </aside>
  );
}
