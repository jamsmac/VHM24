import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: number;
  adminOnly?: boolean;
}

export interface NavGroup {
  id: string;
  label: string;
  icon: string;
  href?: string;
  items?: NavItem[];
  collapsed?: boolean;
  badge?: number;
  adminOnly?: boolean;
}

interface NavigationGroupProps {
  group: NavGroup;
  isCollapsed: boolean;
  isAdmin: boolean;
  onToggle?: (groupId: string) => void;
}

export function NavigationGroup({
  group,
  isCollapsed,
  isAdmin,
  onToggle,
}: NavigationGroupProps) {
  const [location] = useLocation();
  const [isExpanded, setIsExpanded] = useState(!group.collapsed);

  // Don't show admin-only items to non-admins
  if (group.adminOnly && !isAdmin) {
    return null;
  }

  // Filter admin-only items
  const visibleItems = group.items?.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const hasItems = visibleItems && visibleItems.length > 0;
  const isActive = group.href
    ? location === group.href
    : visibleItems?.some((item) => location === item.href);

  const handleToggle = () => {
    if (hasItems) {
      setIsExpanded(!isExpanded);
      onToggle?.(group.id);
    }
  };

  // Single item (no sub-items)
  if (!hasItems && group.href) {
    if (isCollapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={group.href}>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'w-full h-12 relative',
                  isActive
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'text-slate-300 hover:bg-slate-800'
                )}
              >
                <span className="text-xl">{group.icon}</span>
                {group.badge && group.badge > 0 && (
                  <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {group.badge}
                  </span>
                )}
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{group.label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link href={group.href}>
        <Button
          variant="ghost"
          className={cn(
            'w-full justify-start gap-3 px-4 py-3 h-auto',
            isActive
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'text-slate-300 hover:bg-slate-800'
          )}
        >
          <span className="text-xl">{group.icon}</span>
          <span className="text-sm font-medium flex-1">{group.label}</span>
          {group.badge && group.badge > 0 && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {group.badge}
            </span>
          )}
        </Button>
      </Link>
    );
  }

  // Group with sub-items
  if (isCollapsed) {
    // Collapsed mode - show icon with flyout menu on hover
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'w-full h-12 relative',
              isActive
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'text-slate-300 hover:bg-slate-800'
            )}
          >
            <span className="text-xl">{group.icon}</span>
            {group.badge && group.badge > 0 && (
              <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {group.badge}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent side="right" className="w-64 p-2 bg-slate-900 border-slate-700">
          <div className="font-semibold text-white mb-2 px-2 uppercase text-xs tracking-wide">
            {group.label}
          </div>
          <div className="space-y-1">
            {visibleItems?.map((item) => {
              const itemActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3 px-3 py-2 h-auto',
                      itemActive
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'text-slate-300 hover:bg-slate-800'
                    )}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Expanded mode - show full group
  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        className={cn(
          'w-full justify-start gap-3 px-4 py-3 h-auto',
          isActive
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'text-slate-300 hover:bg-slate-800'
        )}
        onClick={handleToggle}
      >
        <span className="text-xl">{group.icon}</span>
        <span className="text-sm font-medium flex-1 text-left uppercase tracking-wide">
          {group.label}
        </span>
        {group.badge && group.badge > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
            {group.badge}
          </span>
        )}
        {hasItems && (
          <span className="text-slate-400">
            {isExpanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )}
          </span>
        )}
      </Button>

      {/* Sub-items */}
      {hasItems && isExpanded && (
        <div className="ml-4 space-y-1">
          {visibleItems.map((item) => {
            const itemActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start gap-3 px-4 py-2 h-auto',
                    itemActive
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'text-slate-300 hover:bg-slate-800'
                  )}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm flex-1 text-left">{item.label}</span>
                  {item.badge && item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Button>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
