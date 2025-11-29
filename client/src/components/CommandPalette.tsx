import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Command } from 'cmdk';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { NavGroup } from './NavigationGroup';

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigationGroups: NavGroup[];
  isAdmin: boolean;
}

interface CommandItem {
  label: string;
  href: string;
  icon: string;
  group: string;
  keywords?: string[];
}

export function CommandPalette({
  open,
  onOpenChange,
  navigationGroups,
  isAdmin,
}: CommandPaletteProps) {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState('');
  const [recentItems, setRecentItems] = useState<CommandItem[]>([]);

  // Build flat list of all navigation items
  const allItems: CommandItem[] = React.useMemo(() => {
    const items: CommandItem[] = [];

    navigationGroups.forEach((group) => {
      // Skip admin-only groups for non-admins
      if (group.adminOnly && !isAdmin) {
        return;
      }

      // Add group itself if it has href
      if (group.href) {
        items.push({
          label: group.label,
          href: group.href,
          icon: group.icon,
          group: 'Navigation',
        });
      }

      // Add sub-items
      group.items?.forEach((item) => {
        if (item.adminOnly && !isAdmin) {
          return;
        }

        items.push({
          label: item.label,
          href: item.href,
          icon: item.icon,
          group: group.label,
        });
      });
    });

    return items;
  }, [navigationGroups, isAdmin]);

  // Load recent items from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('vendhub_recent_commands');
    if (stored) {
      try {
        setRecentItems(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse recent commands:', e);
      }
    }
  }, []);

  const handleSelect = (item: CommandItem) => {
    // Navigate to the selected item
    setLocation(item.href);

    // Add to recent items
    const newRecent = [
      item,
      ...recentItems.filter((r) => r.href !== item.href),
    ].slice(0, 5);
    setRecentItems(newRecent);
    localStorage.setItem('vendhub_recent_commands', JSON.stringify(newRecent));

    // Close the palette
    onOpenChange(false);
    setSearch('');
  };

  // Group items by category
  const groupedItems = React.useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};

    allItems.forEach((item) => {
      if (!groups[item.group]) {
        groups[item.group] = [];
      }
      groups[item.group].push(item);
    });

    return groups;
  }, [allItems]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-2xl">
        <Command className="rounded-lg border-none" shouldFilter>
          <div className="flex items-center border-b px-3">
            <span className="text-slate-400 mr-2">🔍</span>
            <Command.Input
              placeholder="Search for pages, actions, or commands..."
              className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
              value={search}
              onValueChange={setSearch}
            />
            <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-600">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>

          <Command.List className="max-h-[400px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-slate-500">
              No results found.
            </Command.Empty>

            {/* Recent Items */}
            {recentItems.length > 0 && !search && (
              <Command.Group heading="Recent" className="mb-2">
                {recentItems.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.group}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="text-xs text-slate-500">{item.group}</div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* All Items Grouped */}
            {Object.entries(groupedItems).map(([groupName, items]) => (
              <Command.Group key={groupName} heading={groupName} className="mb-2">
                {items.map((item) => (
                  <Command.Item
                    key={item.href}
                    value={`${item.label} ${item.group}`}
                    onSelect={() => handleSelect(item)}
                    className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100"
                  >
                    <span className="text-xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{item.label}</div>
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            ))}

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="mb-2">
              <Command.Item
                value="create machine"
                onSelect={() => {
                  setLocation('/dashboard/machines/create');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100"
              >
                <span className="text-xl">➕</span>
                <span className="text-sm font-medium">Create New Machine</span>
              </Command.Item>
              <Command.Item
                value="create task"
                onSelect={() => {
                  setLocation('/dashboard/tasks/create');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100"
              >
                <span className="text-xl">✅</span>
                <span className="text-sm font-medium">Create New Task</span>
              </Command.Item>
              <Command.Item
                value="create product"
                onSelect={() => {
                  setLocation('/dashboard/products/create');
                  onOpenChange(false);
                }}
                className="flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer hover:bg-slate-100 aria-selected:bg-slate-100"
              >
                <span className="text-xl">🧃</span>
                <span className="text-sm font-medium">Create New Product</span>
              </Command.Item>
            </Command.Group>

            {/* Keyboard Shortcuts */}
            {!search && (
              <Command.Group heading="Keyboard Shortcuts" className="mb-2">
                <Command.Item
                  disabled
                  className="flex items-center justify-between px-3 py-2 text-xs text-slate-500"
                >
                  <span>Open Command Palette</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium">
                    ⌘K
                  </kbd>
                </Command.Item>
                <Command.Item
                  disabled
                  className="flex items-center justify-between px-3 py-2 text-xs text-slate-500"
                >
                  <span>Navigate</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium">
                    ↑↓
                  </kbd>
                </Command.Item>
                <Command.Item
                  disabled
                  className="flex items-center justify-between px-3 py-2 text-xs text-slate-500"
                >
                  <span>Select</span>
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium">
                    ↵
                  </kbd>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
