import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X, LogOut, Settings } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

interface MainLayoutProps {
  children: React.ReactNode;
  userRole?: string;
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: '📊',
  },
  {
    label: 'Access Requests',
    href: '/access-requests',
    icon: '📋',
    adminOnly: true,
  },
  {
    label: 'Users',
    href: '/users',
    icon: '👥',
    adminOnly: true,
  },
  {
    label: 'Machines',
    href: '/machines',
    icon: '🎰',
  },
  {
    label: 'Inventory',
    href: '/inventory',
    icon: '📦',
  },
  {
    label: 'Tasks',
    href: '/tasks',
    icon: '✓',
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: '📈',
  },
  {
    label: 'Master Data',
    href: '/master-data',
    icon: '⚙️',
    adminOnly: true,
  },
];

const settingsItems: NavItem[] = [
  {
    label: 'Digest Settings',
    href: '/digest-settings',
    icon: '📧',
    adminOnly: true,
  },
  {
    label: 'Notification Preferences',
    href: '/notification-preferences',
    icon: '🔔',
  },
];

export function MainLayout({ children, userRole = 'user' }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [location] = useLocation();

  const isAdmin = userRole === 'admin' || userRole === 'manager';

  const visibleNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  const visibleSettingsItems = settingsItems.filter(
    (item) => !item.adminOnly || isAdmin
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'bg-slate-900 text-white transition-all duration-300 flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">
                V
              </div>
              <span className="font-bold text-lg">VendHub</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-slate-800"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          <div className="space-y-1">
            {visibleNavItems.map((item) => (
              <Link key={item.href} href={item.href} className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                location === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              )}
              title={!sidebarOpen ? item.label : undefined}>
                <span className="text-xl">{item.icon}</span>
                {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </Link>
            ))}
          </div>

          {/* Settings Section */}
          {visibleSettingsItems.length > 0 && (
            <>
              <div className="my-4 border-t border-slate-700" />
              <div className="px-4 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {sidebarOpen ? 'Settings' : '⚙️'}
              </div>
              <div className="space-y-1">
                {visibleSettingsItems.map((item) => (
                  <Link key={item.href} href={item.href} className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                    location === item.href
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  )}
                  title={!sidebarOpen ? item.label : undefined}>
                    <span className="text-xl">{item.icon}</span>
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                ))}
              </div>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4">
          <Link href="/login" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors">
            <LogOut size={20} />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-2xl font-bold text-slate-900">VendHub Manager</h1>
          <div className="flex items-center gap-6">
            <NotificationCenter />
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center font-bold text-white text-sm">
              U
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-slate-50 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
