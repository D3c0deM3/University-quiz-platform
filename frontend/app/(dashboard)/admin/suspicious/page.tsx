'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usersApi } from '@/lib/api';
import type { SuspiciousUser, UserDeviceInfo } from '@/lib/types';
import { useDebounce } from '@/lib/useDebounce';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { formatDate, truncate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Monitor,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Lock,
  Unlock,
  User,
  Wifi,
  X,
} from 'lucide-react';

interface SuspiciousMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  deviceWindowDays: number;
}

function getRiskLevel(user: SuspiciousUser): 'high' | 'medium' | 'low' {
  if (!user.isActive || user.blockedDeviceCount > 0) return 'high';
  if (user.recentDeviceCount >= 3 || user.activeSessionCount >= 5) return 'medium';
  return 'low';
}

const riskColors = {
  high: {
    border: 'border-l-red-500 dark:border-l-red-400',
    bg: 'bg-red-50 dark:bg-red-500/5',
    text: 'text-red-700 dark:text-red-300',
    label: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  },
  medium: {
    border: 'border-l-amber-500 dark:border-l-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-500/5',
    text: 'text-amber-700 dark:text-amber-300',
    label: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  },
  low: {
    border: 'border-l-blue-500 dark:border-l-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-500/5',
    text: 'text-blue-700 dark:text-blue-300',
    label: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  },
};

export default function SuspiciousUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<SuspiciousUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<SuspiciousMeta>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
    deviceWindowDays: 7,
  });

  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [devices, setDevices] = useState<UserDeviceInfo[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      const { data } = await usersApi.suspicious({
        page: nextPage,
        limit: 20,
        search: debouncedSearch || undefined,
      });
      setUsers(data.data || []);
      setMeta({
        total: data.meta?.total || 0,
        page: data.meta?.page || nextPage,
        limit: data.meta?.limit || 20,
        totalPages: data.meta?.totalPages || 1,
        deviceWindowDays: data.meta?.deviceWindowDays || 7,
      });
      setPage(nextPage);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, t]);

  const toggleDevicesPanel = useCallback(async (user: SuspiciousUser) => {
    if (expandedUserId === user.id) {
      setExpandedUserId(null);
      setDevices([]);
      return;
    }
    setExpandedUserId(user.id);
    setDevicesLoading(true);
    try {
      const { data } = await usersApi.devices(user.id);
      setDevices(data.devices || []);
    } catch {
      toast.error(t('common.error'));
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, [expandedUserId, t]);

  useEffect(() => {
    void load(1);
  }, [load]);

  const toggleUserBlocked = async (user: SuspiciousUser) => {
    try {
      if (user.isActive) {
        await usersApi.blockUser(user.id);
        toast.success(t('adminSuspicious.userBlocked'));
      } else {
        await usersApi.unblockUser(user.id);
        toast.success(t('adminSuspicious.userUnblocked'));
      }
      await load(page);
      if (expandedUserId === user.id) {
        setDevicesLoading(true);
        try {
          const { data } = await usersApi.devices(user.id);
          setDevices(data.devices || []);
        } finally {
          setDevicesLoading(false);
        }
      }
    } catch {
      toast.error(
        user.isActive
          ? t('adminSuspicious.failedBlockUser')
          : t('adminSuspicious.failedUnblockUser'),
      );
    }
  };

  const toggleDeviceBlocked = async (device: UserDeviceInfo) => {
    if (!expandedUserId) return;
    if (!device.fingerprintHash) {
      toast.error(t('adminSuspicious.fingerprintMissing'));
      return;
    }

    try {
      if (device.blocked) {
        await usersApi.unblockDevice(expandedUserId, device.fingerprintHash);
        toast.success(t('adminSuspicious.deviceUnblocked'));
      } else {
        await usersApi.blockDevice(expandedUserId, device.fingerprintHash);
        toast.success(t('adminSuspicious.deviceBlocked'));
      }
      const { data } = await usersApi.devices(expandedUserId);
      setDevices(data.devices || []);
      await load(page);
    } catch {
      toast.error(
        device.blocked
          ? t('adminSuspicious.failedUnblockDevice')
          : t('adminSuspicious.failedBlockDevice'),
      );
    }
  };

  const totalPages = useMemo(() => Math.max(meta.totalPages || 1, 1), [meta.totalPages]);

  const summaryStats = useMemo(() => {
    const blocked = users.filter((u) => !u.isActive).length;
    const autoBlocked = users.filter((u) => u.autoBlocked).length;
    return { blocked, autoBlocked, active: users.length - blocked };
  }, [users]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
            {t('adminSuspicious.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            {t('adminSuspicious.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-zinc-500">
          <Clock size={14} />
          {t('adminSuspicious.windowHint', { days: meta.deviceWindowDays })}
        </div>
      </div>

      {/* Summary stats bar */}
      {!loading && users.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
              <AlertTriangle size={16} />
              <span className="text-xs font-medium">{t('adminSuspicious.totalFlagged')}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-zinc-100">
              {meta.total}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <ShieldCheck size={16} />
              <span className="text-xs font-medium">{t('adminSuspicious.userStatusActive')}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-zinc-100">
              {summaryStats.active}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <ShieldX size={16} />
              <span className="text-xs font-medium">{t('adminSuspicious.userStatusBlocked')}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-zinc-100">
              {summaryStats.blocked}
            </p>
          </div>
          <div className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <ShieldAlert size={16} />
              <span className="text-xs font-medium">{t('adminSuspicious.autoBlocked')}</span>
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-zinc-100">
              {summaryStats.autoBlocked}
            </p>
          </div>
        </div>
      )}

      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
          <Input
            placeholder={t('adminSuspicious.searchPlaceholder')}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-zinc-400">
          {t('adminSuspicious.total', { count: meta.total })}
        </span>
      </div>

      {/* User list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={48} />}
          title={t('adminSuspicious.noUsers')}
          description={t('adminSuspicious.subtitle')}
        />
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const risk = getRiskLevel(user);
            const colors = riskColors[risk];
            const isExpanded = expandedUserId === user.id;

            return (
              <Card
                key={user.id}
                className={`overflow-hidden border-l-4 ${colors.border} transition-shadow hover:shadow-md`}
              >
                <CardContent className="p-0">
                  {/* User row */}
                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      {/* User identity */}
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 rounded-full p-2 ${colors.bg}`}>
                          <User size={18} className={colors.text} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-gray-900 dark:text-zinc-100">
                              {user.firstName} {user.lastName}
                            </p>
                            <Badge variant={user.isActive ? 'success' : 'destructive'}>
                              {user.isActive
                                ? t('adminSuspicious.userStatusActive')
                                : t('adminSuspicious.userStatusBlocked')}
                            </Badge>
                            {!user.isActive && (
                              <Badge variant={user.autoBlocked ? 'warning' : 'secondary'}>
                                {user.autoBlocked
                                  ? t('adminSuspicious.autoBlocked')
                                  : t('adminSuspicious.manualBlocked')}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
                            {user.phone} &middot; {t('adminSuspicious.joined')} {formatDate(user.createdAt)}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 sm:shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleDevicesPanel(user)}
                          className="gap-1.5"
                        >
                          <Smartphone size={14} />
                          {t('adminSuspicious.manageDevices')}
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </Button>
                        <Button
                          size="sm"
                          variant={user.isActive ? 'destructive' : 'secondary'}
                          onClick={() => toggleUserBlocked(user)}
                          className="gap-1.5"
                        >
                          {user.isActive ? <ShieldX size={14} /> : <ShieldCheck size={14} />}
                          {user.isActive ? t('common.block') : t('common.unblock')}
                        </Button>
                      </div>
                    </div>

                    {/* Inline stats */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
                      <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                        <Monitor size={14} className="text-gray-400 dark:text-zinc-500" />
                        <span className="font-medium">{user.deviceCount}</span>
                        {t('adminSuspicious.devices')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                        <Clock size={14} className="text-gray-400 dark:text-zinc-500" />
                        <span className={`font-medium ${user.recentDeviceCount >= 3 ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                          {user.recentDeviceCount}
                        </span>
                        {t('adminSuspicious.recentDevices')}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-gray-600 dark:text-zinc-300">
                        <Wifi size={14} className="text-gray-400 dark:text-zinc-500" />
                        <span className="font-medium">{user.activeSessionCount}</span>
                        {t('adminSuspicious.activeSessions')}
                      </span>
                      {user.blockedDeviceCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-red-600 dark:text-red-400">
                          <Lock size={14} />
                          <span className="font-medium">{user.blockedDeviceCount}</span>
                          {t('adminSuspicious.blockedDevices')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded device panel (inline under user) */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-900/50">
                      <div className="flex items-center justify-between px-4 py-3 sm:px-5">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-zinc-300">
                          {t('adminSuspicious.devicesFor', {
                            name: `${user.firstName} ${user.lastName}`,
                          })}
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setExpandedUserId(null);
                            setDevices([]);
                          }}
                          className="h-7 w-7 p-0"
                        >
                          <X size={14} />
                        </Button>
                      </div>

                      {devicesLoading ? (
                        <div className="px-4 pb-4 sm:px-5 space-y-2">
                          {[1, 2].map((i) => (
                            <Skeleton key={i} className="h-16 w-full rounded-lg" />
                          ))}
                        </div>
                      ) : devices.length === 0 ? (
                        <div className="px-4 pb-6 sm:px-5">
                          <EmptyState
                            icon={<Smartphone size={32} />}
                            title={t('adminSuspicious.noDevices')}
                            className="py-8"
                          />
                        </div>
                      ) : (
                        <div className="px-4 pb-4 sm:px-5 space-y-2">
                          {devices.map((device) => (
                            <div
                              key={device.deviceKey}
                              className={`flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:gap-3 ${
                                device.blocked
                                  ? 'border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/5'
                                  : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
                              }`}
                            >
                              {/* Device info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Smartphone
                                    size={14}
                                    className={
                                      device.blocked
                                        ? 'text-red-500 dark:text-red-400'
                                        : 'text-gray-400 dark:text-zinc-500'
                                    }
                                  />
                                  <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">
                                    {device.deviceName || t('common.unknown')}
                                  </p>
                                  {device.blocked && (
                                    <Badge variant="destructive">{t('adminSuspicious.userStatusBlocked')}</Badge>
                                  )}
                                </div>
                                <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400 truncate pl-[22px]">
                                  {truncate(device.userAgent || t('common.unknown'), 80)}
                                </p>
                              </div>

                              {/* Device meta */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-zinc-400 pl-[22px] sm:pl-0 sm:shrink-0">
                                <span>{t('adminSuspicious.lastSeen')}: {new Date(device.lastSeenAt).toLocaleDateString()}</span>
                                {device.lastIp && <span>IP: {device.lastIp}</span>}
                                <span>
                                  {device.activeSessions}/{device.totalSessions} {t('adminSuspicious.sessions')}
                                </span>
                                {device.fingerprintHash && (
                                  <span className="font-mono text-[10px]">
                                    {device.fingerprintHash.slice(0, 10)}...
                                  </span>
                                )}
                              </div>

                              {/* Device action */}
                              <Button
                                size="sm"
                                variant={device.blocked ? 'secondary' : 'destructive'}
                                onClick={() => toggleDeviceBlocked(device)}
                                disabled={!device.fingerprintHash}
                                className="gap-1.5 sm:shrink-0"
                              >
                                {device.blocked ? <Unlock size={14} /> : <Lock size={14} />}
                                {device.blocked
                                  ? t('adminSuspicious.unblockDevice')
                                  : t('adminSuspicious.blockDevice')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            {t('common.previous')}
          </Button>
          <span className="text-sm text-gray-500 dark:text-zinc-400">
            {t('common.page')} {page} {t('common.of')} {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  );
}
