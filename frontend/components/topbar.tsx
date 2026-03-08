'use client';

import { useAuthStore } from '@/stores/auth-store';
import { Bell, User } from 'lucide-react';

export function Topbar() {
  const { user } = useAuthStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">
          Welcome back, {user?.firstName || 'User'}
        </h2>
        <p className="text-sm text-gray-500 capitalize">{user?.role?.toLowerCase() || ''}</p>
      </div>
      <div className="flex items-center gap-4">
        <button className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer">
          <Bell size={20} />
        </button>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
            <User size={16} />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-500">{user?.email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
