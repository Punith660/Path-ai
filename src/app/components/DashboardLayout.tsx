import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { 
  Shield, 
  Upload, 
  BarChart, 
  List, 
  FileSearch, 
  History, 
  Trophy, 
  Settings, 
  HelpCircle,
  LogOut,
  LogIn
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useAuth } from '../context/AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const managerMenuItems = ['/rank', '/ranking', '/ranking-history'];

const allMenuItems = [
  { icon: Upload, label: 'Upload', path: '/' },
  { icon: BarChart, label: 'Summary', path: '/summary' },
  { icon: List, label: 'Skills', path: '/skills' },
  { icon: FileSearch, label: 'Evidence', path: '/evidence' },
  { icon: Trophy, label: 'Ranking', path: '/rank' },
  { icon: History, label: 'Reports', path: '/reports' },
  { icon: History, label: 'Ranking History', path: '/ranking-history' },
];

const subMenu = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

export function DashboardLayout() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const menu = user?.role === 'candidate'
    ? allMenuItems.filter(item => !managerMenuItems.includes(item.path))
    : allMenuItems;

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans">
      {/* Sidebar (PathAI shell styling) */}
      <aside className="fixed left-0 top-0 z-40 h-full w-56 border-r border-sidebar-border bg-sidebar flex flex-col">
        <div className="h-14 px-5 flex items-center gap-2.5 border-b border-sidebar-border">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-md bg-electric-blue/10 border border-electric-blue/20">
            <Shield className="w-4.5 h-4.5 text-electric-blue" />
          </div>
          <span className="font-bold text-foreground tracking-tight">
            PathAI <span className="text-electric-blue">Verify</span>
          </span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150",
                  isActive
                    ? "bg-secondary border border-border text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0 transition-colors" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border space-y-1">
          {subMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150",
                  isActive
                    ? "bg-secondary border border-border text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0 transition-colors" />
              {item.label}
            </NavLink>
          ))}
        </div>

        {/* User profile / Logout section */}
        <div className="p-3 border-t border-sidebar-border mt-auto bg-secondary/20">
          {isAuthenticated && user ? (
            <div className="space-y-2">
              <div className="px-2 py-1 bg-secondary/40 rounded border border-border/30">
                <p className="text-xs font-semibold text-foreground truncate" title={user.username}>{user.username}</p>
                <p className="text-[9px] text-electric-blue font-bold uppercase tracking-wider mt-0.5">
                  {user.role}
                </p>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-destructive hover:bg-destructive/10 hover:text-destructive transition-all duration-150 border border-transparent hover:border-destructive/20 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <NavLink
              to="/login"
              className="group flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-electric-blue hover:bg-electric-blue/10 transition-all duration-150 border border-transparent hover:border-electric-blue/20"
            >
              <LogIn className="w-3.5 h-3.5 shrink-0" />
              <span>Sign In</span>
            </NavLink>
          )}
        </div>
      </aside>

      {/* Content */}
      <div className="ml-56 flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-sidebar-border flex items-center px-8 justify-between glass-card">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {location.pathname === '/' ? 'New Scan' : location.pathname.split('/').pop()}
          </h2>
          <div className="text-[10px] text-muted-foreground">Version 1.0.4 • Secure</div>
        </header>

        <main className="flex-1 overflow-y-auto px-8 py-8 max-w-6xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
