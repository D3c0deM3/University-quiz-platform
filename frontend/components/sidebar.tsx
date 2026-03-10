'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Search,
  ClipboardList,
  History,
  Upload,
  FileText,
  Users,
  Settings,
  LogOut,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  CreditCard,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
  section?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/subjects', label: 'Subjects', icon: <BookOpen size={20} /> },
  { href: '/questions', label: 'Q&A Bank', icon: <HelpCircle size={20} /> },
  { href: '/search', label: 'Search', icon: <Search size={20} /> },
  { href: '/quiz-history', label: 'Quiz History', icon: <History size={20} /> },
  // Admin/Teacher items
  { href: '/admin/dashboard', label: 'Admin Panel', icon: <Settings size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/questions', label: 'Review Q&A', icon: <HelpCircle size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/materials', label: 'Materials', icon: <FileText size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/upload', label: 'Upload', icon: <Upload size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/subjects', label: 'Subjects', icon: <BookOpen size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/users', label: 'Users', icon: <Users size={20} />, roles: ['ADMIN'], section: 'admin' },
  { href: '/admin/subscriptions', label: 'Subscriptions', icon: <CreditCard size={20} />, roles: ['ADMIN'], section: 'admin' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-4">
        <GraduationCap size={28} className="text-blue-600 shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-gray-900 truncate">UniTest</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredItems.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const prevItem = filteredItems[idx - 1];
          const showDivider = item.section === 'admin' && prevItem && prevItem.section !== 'admin';
          return (
            <div key={item.href}>
              {showDivider && (
                <div className="my-3">
                  <div className="border-t border-gray-200" />
                  {!collapsed && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mt-3 mb-1 px-3">
                      Administration
                    </p>
                  )}
                </div>
              )}
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-2 space-y-1">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span>Collapse</span>}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
        >
          <LogOut size={20} />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
