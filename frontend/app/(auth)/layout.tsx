'use client';

import { GraduationCap } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="inline-flex items-center justify-center p-4 bg-white/10 rounded-2xl mb-8 backdrop-blur-sm">
            <GraduationCap size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">{t('authLayout.brand')}</h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            {t('authLayout.desc')}
          </p>
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">{t('authLayout.ai')}</p>
              <p className="text-blue-200 text-xs mt-1">{t('authLayout.aiDesc')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">{t('authLayout.search')}</p>
              <p className="text-blue-200 text-xs mt-1">{t('authLayout.searchDesc')}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-2xl font-bold text-white">{t('authLayout.track')}</p>
              <p className="text-blue-200 text-xs mt-1">{t('authLayout.trackDesc')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel — Auth Form */}
      <div className="flex flex-1 items-center justify-center bg-gray-50 dark:bg-zinc-950 px-4 py-8">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile branding */}
          <div className="flex items-center justify-center gap-2 mb-8 lg:hidden">
            <GraduationCap size={28} className="text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold text-gray-900 dark:text-zinc-100">{t('authLayout.brand')}</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
