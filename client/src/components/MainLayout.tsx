import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, LogOut, Settings, HelpCircle, Search } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { NavigationGroup, type NavGroup } from './NavigationGroup';
import { FavoritesSection } from './FavoritesSection';
import { UserMenu } from './UserMenu';
import { CommandPalette } from './CommandPalette';

interface MainLayoutProps {
  children: React.ReactNode;
  userRole?: string;
}

const navigationGroups: NavGroup[] = [
  {
    id: 'home',
    label: 'Home',
    icon: '🏠',
    href: '/dashboard',
  },
  {
    id: 'operations',
    label: 'Operations',
    icon: '🏭',
    collapsed: false,
    items: [
      { label: 'Machines', icon: '📦', href: '/dashboard/machines' },
      { label: 'Tasks', icon: '📋', href: '/dashboard/tasks', badge: 5 },
      { label: 'Equipment', icon: '🔧', href: '/dashboard/equipment' },
      { label: 'Locations', icon: '📍', href: '/dashboard/locations' },
      { label: 'QR Scanner', icon: '📷', href: '/dashboard/scan' },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventory & Accounting',
    icon: '📦',
    collapsed: true,
    items: [
      { label: 'Overview', icon: '📊', href: '/dashboard/inventory' },
      { label: 'Warehouse', icon: '🏭', href: '/dashboard/inventory/warehouse' },
      { label: 'Operators', icon: '👤', href: '/dashboard/inventory/operators' },
      { label: 'Machines', icon: '🎰', href: '/dashboard/inventory/machines' },
      { label: 'Transfers', icon: '🔄', href: '/dashboard/inventory/transfer' },
      { label: 'Products', icon: '🧃', href: '/dashboard/products' },
      { label: 'Recipes', icon: '📝', href: '/dashboard/recipes' },
      { label: 'Purchases', icon: '🛒', href: '/dashboard/purchases' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    icon: '💰',
    collapsed: true,
    adminOnly: true,
    items: [
      { label: 'Transactions', icon: '💳', href: '/dashboard/transactions' },
      { label: 'Counterparties', icon: '🏢', href: '/dashboard/counterparties' },
      { label: 'Contracts', icon: '📄', href: '/dashboard/contracts' },
      { label: 'Commissions', icon: '💵', href: '/dashboard/commissions' },
    ],
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: '📊',
    collapsed: true,
    items: [
      { label: 'Dashboard', icon: '📈', href: '/dashboard/analytics' },
      { label: 'Reports', icon: '📋', href: '/dashboard/reports' },
      { label: 'Incidents', icon: '⚠️', href: '/dashboard/incidents' },
    ],
  },
  {
    id: 'team',
    label: 'Team',
    icon: '👥',
    collapsed: true,
    badge: 2,
    items: [
      { label: 'Users', icon: '👤', href: '/dashboard/users' },
      { label: 'Access Requests', icon: '📋', href: '/dashboard/access-requests', badge: 2 },
      { label: 'Complaints', icon: '📢', href: '/dashboard/complaints' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    icon: '⚙️',
    collapsed: true,
    adminOnly: true,
    items: [
      { label: 'Settings', icon: '⚙️', href: '/dashboard/settings' },
      { label: 'AI Agents', icon: '🤖', href: '/dashboard/ai-agents' },
      { label: 'Audit Logs', icon: '📜', href: '/dashboard/audit-logs' },
      { label: 'Webhooks', icon: '🔗', href: '/dashboard/webhooks' },
      { label: 'API Keys', icon: '🔑', href: '/dashboard/api-keys' },
    ],
  },
];

export function MainLayout({ children, userRole = 'user' }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [location] = useLocation();

  const isAdmin = userRole === 'admin' || userRole === 'manager';

  // Keyboard shortcut for Command Palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-background">
      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        navigationGroups={navigationGroups}
        isAdmin={isAdmin}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-slate-900 text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 h-16">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-lg">
                V
              </div>
              <span className="font-bold text-lg">VendHub Manager</span>
            </div>
          )}
          {!sidebarOpen && (
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center font-bold text-lg mx-auto">
              V
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={cn(
              'text-white hover:bg-slate-800',
              !sidebarOpen && 'hidden'
            )}
          >
            <X size={20} />
          </Button>
        </div>

        {/* Favorites Section */}
        <FavoritesSection isCollapsed={!sidebarOpen} />

        {/* Divider */}
        {sidebarOpen && <div className="border-t border-slate-700 mx-4 my-2" />}

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-1">
            {navigationGroups.map((group) => (
              <NavigationGroup
                key={group.id}
                group={group}
                isCollapsed={!sidebarOpen}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          {sidebarOpen ? (
            <div className="space-y-2">
              <Link href="/dashboard/settings">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800"
                >
                  <Settings size={20} />
                  <span className="text-sm">Settings</span>
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <HelpCircle size={20} />
                <span className="text-sm">Help</span>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-slate-300 hover:bg-slate-800"
              >
                <Settings size={20} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-slate-300 hover:bg-slate-800"
                onClick={() => setCommandPaletteOpen(true)}
              >
                <HelpCircle size={20} />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            {!sidebarOpen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(true)}
                className="text-slate-600 hover:bg-slate-100"
              >
                <Menu size={20} />
              </Button>
            )}
            <div className="relative w-96">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <Input
                placeholder="Search... (⌘K)"
                className="pl-10 bg-slate-50 border-slate-200"
                onClick={() => setCommandPaletteOpen(true)}
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationCenter />
            <Button
              variant="ghost"
              size="icon"
              className="text-slate-600 hover:bg-slate-100"
              onClick={() => setCommandPaletteOpen(true)}
            >
              <HelpCircle size={20} />
            </Button>
            <UserMenu userRole={userRole} />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-8">{children}</main>
      </div>
    </div>
  );
}

export default MainLayout;
