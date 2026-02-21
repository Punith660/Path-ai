import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { 
  Shield, 
  Upload, 
  BarChart, 
  List, 
  FileSearch, 
  History, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const menu = [
  { icon: Upload, label: 'Upload', path: '/' },
  { icon: BarChart, label: 'Summary', path: '/summary' },
  { icon: List, label: 'Skills', path: '/skills' },
  { icon: FileSearch, label: 'Evidence', path: '/evidence' },
  { icon: History, label: 'Reports', path: '/reports' },
];

const subMenu = [
  { icon: Settings, label: 'Settings', path: '/settings' },
  { icon: HelpCircle, label: 'Help', path: '/help' },
];

export function DashboardLayout() {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-black text-slate-300 font-sans border-t-2 border-indigo-600">
      {/* Sidebar */}
      <aside className="w-56 border-r border-slate-900 flex flex-col">
        <div className="p-6 flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-indigo-500" />
          <span className="font-bold text-white tracking-tight">PathAI Verify</span>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {menu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                isActive 
                  ? "bg-slate-900 text-white" 
                  : "hover:text-white hover:bg-slate-900/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="px-3 py-6 border-t border-slate-900 space-y-1">
          {subMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                isActive 
                  ? "bg-slate-900 text-white" 
                  : "hover:text-white hover:bg-slate-900/50"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          ))}
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-slate-900 flex items-center px-8 justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {location.pathname === '/' ? 'New Scan' : location.pathname.split('/').pop()}
          </h2>
          <div className="text-[10px] text-slate-600">Version 1.0.4 • Secure</div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
