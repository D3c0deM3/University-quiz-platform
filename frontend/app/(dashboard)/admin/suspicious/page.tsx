'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usersApi } from '@/lib/api';
import type { SuspiciousUser, UserDeviceInfo } from '@/lib/types';
import { useDebounce } from '@/lib/useDebounce';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { formatDate, truncate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Search,
  ShieldCheck,
  ShieldX,
  Smartphone,
  Lock,
  Unlock,
} from 'lucide-react';

interface SuspiciousMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  deviceWindowDays: number;
}

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

  const [selectedUser, setSelectedUser] = useState<SuspiciousUser | null>(null);
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

  const loadDevices = useCallback(async (user: SuspiciousUser) => {
    setSelectedUser(user);
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
  }, [t]);

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
      if (selectedUser?.id === user.id) {
        await loadDevices({ ...user, isActive: !user.isActive });
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
    if (!selectedUser) return;
    if (!device.fingerprintHash) {
      toast.error(t('adminSuspicious.fingerprintMissing'));
      return;
    }

    try {
      if (device.blocked) {
        await usersApi.unblockDevice(selectedUser.id, device.fingerprintHash);
        toast.success(t('adminSuspicious.deviceUnblocked'));
      } else {
        await usersApi.blockDevice(selectedUser.id, device.fingerprintHash);
        toast.success(t('adminSuspicious.deviceBlocked'));
      }
      await loadDevices(selectedUser);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('adminSuspicious.title')}</h1>
        <p className="text-gray-500 dark:text-zinc-400">{t('adminSuspicious.subtitle')}</p>
      </div>

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
        <span className="text-sm text-gray-500 dark:text-zinc-400">{t('adminSuspicious.total', { count: meta.total })}</span>
      </div>

      <p className="text-xs text-gray-400 dark:text-zinc-500">{t('adminSuspicious.windowHint', { days: meta.deviceWindowDays })}</p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <EmptyState
          icon={<AlertTriangle size={48} />}
          title={t('adminSuspicious.noUsers')}
          description={t('adminSuspicious.subtitle')}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {users.map((user) => (
                <div key={user.id} className="p-4 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-zinc-100">{user.firstName} {user.lastName}</p>
                      <p className="text-sm text-gray-500 dark:text-zinc-400">{user.phone} • {formatDate(user.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={user.isActive ? 'success' : 'destructive'}>
                        {user.isActive ? t('adminSuspicious.userStatusActive') : t('adminSuspicious.userStatusBlocked')}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant={user.autoBlocked ? 'warning' : 'secondary'}>
                          {user.autoBlocked ? t('adminSuspicious.autoBlocked') : t('adminSuspicious.manualBlocked')}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{t('adminSuspicious.devices')}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{user.deviceCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{t('adminSuspicious.recentDevices')}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{user.recentDeviceCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{t('adminSuspicious.activeSessions')}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{user.activeSessionCount}</p>
                    </div>
                    <div className="rounded-lg border border-gray-200 dark:border-zinc-700 px-3 py-2">
                      <p className="text-xs text-gray-500 dark:text-zinc-400">{t('adminSuspicious.blockedDevices')}</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-zinc-100">{user.blockedDeviceCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => loadDevices(user)}
                    >
                      <Smartphone size={14} />
                      {t('adminSuspicious.manageDevices')}
                    </Button>
                    <Button
                      size="sm"
                      variant={user.isActive ? 'destructive' : 'secondary'}
                      onClick={() => toggleUserBlocked(user)}
                    >
                      {user.isActive ? <ShieldX size={14} /> : <ShieldCheck size={14} />}
                      {user.isActive ? t('common.block') : t('common.unblock')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
            {t('common.previous')}
          </Button>
          <span className="text-sm text-gray-500 dark:text-zinc-400">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}

      {selectedUser && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t('adminSuspicious.manageDevices')}: {selectedUser.firstName} {selectedUser.lastName}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {devicesLoading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : devices.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={<Smartphone size={40} />}
                  title={t('adminSuspicious.noDevices')}
                  description={t('adminSuspicious.subtitle')}
                />
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                {devices.map((device) => (
                  <div key={device.deviceKey} className="p-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-zinc-100">
                        {device.deviceName || t('common.unknown')}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">
                        {truncate(device.userAgent || t('common.unknown'), 90)}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                        {t('adminSuspicious.lastSeen')}: {new Date(device.lastSeenAt).toLocaleString()}
                        {device.lastIp ? ` • IP ${device.lastIp}` : ''}
                        {device.fingerprintHash ? ` • ${device.fingerprintHash.slice(0, 10)}…` : ''}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                      {device.activeSessions}/{device.totalSessions} {t('adminSuspicious.sessions')}
                    </div>
                    <Button
                      size="sm"
                      variant={device.blocked ? 'secondary' : 'destructive'}
                      onClick={() => toggleDeviceBlocked(device)}
                      disabled={!device.fingerprintHash}
                    >
                      {device.blocked ? <Unlock size={14} /> : <Lock size={14} />}
                      {device.blocked ? t('adminSuspicious.unblockDevice') : t('adminSuspicious.blockDevice')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
