'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useLanguageStore, type Language } from '@/stores/language-store';
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
  Globe,
  Moon,
  Sun,
} from 'lucide-react';
import { useState } from 'react';
import { useThemeStore } from '@/stores/theme-store';

const languageOptions: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

interface NavItem {
  href: string;
  labelKey: string;
  icon: React.ReactNode;
  roles?: string[];
  section?: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', labelKey: 'sidebar.dashboard', icon: <LayoutDashboard size={20} /> },
  { href: '/subjects', labelKey: 'sidebar.subjects', icon: <BookOpen size={20} /> },
  { href: '/questions', labelKey: 'sidebar.qaBank', icon: <HelpCircle size={20} /> },
  { href: '/search', labelKey: 'sidebar.search', icon: <Search size={20} /> },
  { href: '/quiz-history', labelKey: 'sidebar.quizHistory', icon: <History size={20} /> },
  // Admin/Teacher items
  { href: '/admin/dashboard', labelKey: 'sidebar.adminPanel', icon: <Settings size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/questions', labelKey: 'sidebar.reviewQA', icon: <HelpCircle size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/materials', labelKey: 'sidebar.materials', icon: <FileText size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/upload', labelKey: 'sidebar.upload', icon: <Upload size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/subjects', labelKey: 'sidebar.subjects2', icon: <BookOpen size={20} />, roles: ['ADMIN', 'TEACHER'], section: 'admin' },
  { href: '/admin/users', labelKey: 'sidebar.users', icon: <Users size={20} />, roles: ['ADMIN'], section: 'admin' },
  { href: '/admin/subscriptions', labelKey: 'sidebar.subscriptions', icon: <CreditCard size={20} />, roles: ['ADMIN'], section: 'admin' },
];

export function Sidebar({ onNavClick }: { onNavClick?: () => void } = {}) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();
  const { theme, setTheme } = useThemeStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-200 dark:border-zinc-700 dark:bg-zinc-900',
        collapsed ? 'w-16' : 'w-64',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 dark:border-zinc-700 px-4">
        <GraduationCap size={28} className="text-blue-600 dark:text-blue-400 shrink-0" />
        {!collapsed && (
          <span className="text-lg font-bold text-gray-900 dark:text-zinc-100 truncate">UniTest</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {filteredItems.map((item, idx) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const prevItem = filteredItems[idx - 1];
          const showDivider = item.section === 'admin' && prevItem && prevItem.section !== 'admin';
          const label = t(item.labelKey);
          return (
            <div key={item.href}>
              {showDivider && (
                <div className="my-3">
                  <div className="border-t border-gray-200 dark:border-zinc-700" />
                  {!collapsed && (
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mt-3 mb-1 px-3">
                      {t('sidebar.administration')}
                    </p>
                  )}
                </div>
              )}
              <Link
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.98]',
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200',
                  collapsed && 'justify-center px-2',
                )}
                title={collapsed ? label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{label}</span>}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-zinc-700 p-2 space-y-1">
        {/* Language switcher — mobile only */}
        {!collapsed && (
          <div className="lg:hidden px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-zinc-500 mb-1">{t('topbar.language') || 'Language'}</p>
            <div className="flex gap-1">
              {languageOptions.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => setLanguage(opt.code)}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                    language === opt.code
                      ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/20'
                      : 'text-gray-600 hover:bg-gray-50 border border-gray-200 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:border-zinc-700',
                  )}
                >
                  <span>{opt.flag}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
          title={collapsed ? (theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          {!collapsed && <span>{theme === 'dark' ? t('theme.light') : t('theme.dark')}</span>}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800 cursor-pointer"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span>{collapsed ? '' : t('common.close')}</span>}
        </button>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15 cursor-pointer"
        >
          <LogOut size={20} />
          {!collapsed && <span>{t('sidebar.logout')}</span>}
        </button>
      </div>
    </aside>
  );
}
