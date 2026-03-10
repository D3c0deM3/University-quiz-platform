'use client';

import { useAuthStore } from '@/stores/auth-store';
import { useLanguageStore, type Language } from '@/stores/language-store';
import { useTranslation } from '@/lib/i18n';
import { Bell, User, Menu, Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const languageOptions: { code: Language; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'uz', label: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
];

interface TopbarProps {
  onMenuClick?: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user } = useAuthStore();
  const { language, setLanguage } = useLanguageStore();
  const { t } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languageOptions.find((l) => l.code === language) ?? languageOptions[0];

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="rounded-lg p-2.5 text-gray-500 hover:bg-gray-100 lg:hidden cursor-pointer active:scale-95 transition-transform"
          >
            <Menu size={22} />
          </button>
        )}
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('topbar.welcome')}, {user?.firstName || 'User'}
          </h2>
          <p className="text-sm text-gray-500 capitalize">{user?.role?.toLowerCase() || ''}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Language Switcher — hidden on mobile */}
        <div className="relative hidden sm:block" ref={langRef}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
          >
            <Globe size={16} />
            <span>{currentLang.flag} {currentLang.label}</span>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-gray-200 bg-white py-1 shadow-lg z-50">
              {languageOptions.map((opt) => (
                <button
                  key={opt.code}
                  onClick={() => {
                    setLanguage(opt.code);
                    setLangOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                    language === opt.code
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>{opt.flag}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Bell — hidden on mobile */}
        <button className="hidden sm:block rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
          <Bell size={20} />
        </button>
        {/* User avatar — always show icon, name only on sm+ */}
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 sm:px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 shrink-0">
            <User size={16} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.phone}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
