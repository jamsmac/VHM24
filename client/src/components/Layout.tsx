import { cn } from "@/lib/utils";
import {
  BarChart3,
  Box,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  Store,
  Database,
  Users,
  UserCheck
} from "lucide-react";
import { Link, useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: Store, label: "Machines", href: "/machines" },
    { icon: Box, label: "Inventory", href: "/inventory" },
    { icon: ClipboardList, label: "Tasks", href: "/tasks" },
    { icon: Users, label: "Users", href: "/users" },
    { icon: UserCheck, label: "Заявки на доступ", href: "/access-requests" },
    { icon: Database, label: "Master Data", href: "/master-data" },
    { icon: BarChart3, label: "Reports", href: "/reports" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary selection:text-primary-foreground overflow-hidden relative">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[120px] animate-pulse delay-1000" />
        <div className="absolute top-[40%] left-[40%] w-[30%] h-[30%] rounded-full bg-accent/10 blur-[100px] animate-pulse delay-2000" />
      </div>

      <div className="relative z-10 flex h-screen">
        {/* Glass Sidebar */}
        <aside className="w-64 hidden md:flex flex-col border-r border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-white font-bold text-xl">V</span>
            </div>
            <span className="font-heading font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">
              VendHub
            </span>
          </div>

          <nav className="flex-1 px-4 py-4 space-y-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group cursor-pointer",
                      isActive
                        ? "bg-primary/20 text-white shadow-lg shadow-primary/10 border border-white/10"
                        : "text-muted-foreground hover:bg-white/5 hover:text-white hover:translate-x-1"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-colors",
                        isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-white"
                      )}
                    />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.8)]" />
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5">
            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all duration-300 group">
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </button>
            <button className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-destructive hover:bg-destructive/10 transition-all duration-300 mt-1">
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto scrollbar-hide bg-gradient-to-br from-slate-50 to-slate-100">
          <div className="container py-8 md:py-12 px-4 md:px-8 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
