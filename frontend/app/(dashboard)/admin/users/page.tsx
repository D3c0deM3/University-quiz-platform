'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { usersApi } from '@/lib/api';
import type { User, Role } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { useDebounce } from '@/lib/useDebounce';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { Users, Search, Shield, GraduationCap, BookOpen, Trash2, AlertTriangle, X } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const roleVariant = (role: Role) => {
 switch (role) {
 case 'ADMIN': return 'destructive' as const;
 case 'TEACHER': return 'warning' as const;
 case 'STUDENT': return 'default' as const;
 }
};

const roleIcon = (role: Role) => {
 switch (role) {
 case 'ADMIN': return <Shield size={14} />;
 case 'TEACHER': return <BookOpen size={14} />;
 case 'STUDENT': return <GraduationCap size={14} />;
 }
};

export default function UsersPage() {
 const { t } = useTranslation();
 const [users, setUsers] = useState<User[]>([]);
 const [search, setSearch] = useState('');
 const [roleFilter, setRoleFilter] = useState('');
 const [page, setPage] = useState(1);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(true);

 // Delete confirmation state
 const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
 const [deleteStep, setDeleteStep] = useState<1 | 2>(1); // 1 = first confirm, 2 = type name
 const [deleteConfirmName, setDeleteConfirmName] = useState('');
 const [deleting, setDeleting] = useState(false);
 const confirmInputRef = useRef<HTMLInputElement>(null);

 const debouncedSearch = useDebounce(search, 350);
 const debouncedRole = useDebounce(roleFilter, 350);

 const load = useCallback(async (p = 1) => {
 setLoading(true);
 try {
 const params: Record<string, string | number | undefined> = { page: p, limit: 20 };
 if (debouncedSearch) params.search = debouncedSearch;
 if (debouncedRole) params.role = debouncedRole;
 const { data } = await usersApi.list(params as { page?: number; limit?: number; role?: string; search?: string });
 setUsers(data.data || []);
 setTotal(data.meta?.total || 0);
 setPage(p);
 } finally {
 setLoading(false);
 }
 }, [debouncedSearch, debouncedRole]);

 useEffect(() => {
 load();
 }, [load]);

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 load(1);
 };

 const changeRole = async (userId: string, newRole: string) => {
 try {
 await usersApi.assignRole(userId, newRole);
 toast.success(t('adminUsers.roleUpdated'));
 load(page);
 } catch {
 toast.error(t('adminUsers.failedUpdateRole'));
 }
 };

 const openDeleteDialog = (user: User) => {
 setDeleteTarget(user);
 setDeleteStep(1);
 setDeleteConfirmName('');
 };

 const closeDeleteDialog = () => {
 setDeleteTarget(null);
 setDeleteStep(1);
 setDeleteConfirmName('');
 };

 const proceedToStep2 = () => {
 setDeleteStep(2);
 setDeleteConfirmName('');
 setTimeout(() => confirmInputRef.current?.focus(), 100);
 };

 const handleDelete = async () => {
 if (!deleteTarget) return;
 setDeleting(true);
 try {
 await usersApi.delete(deleteTarget.id);
 toast.success(t('adminUsers.userDeleted', { name: `${deleteTarget.firstName} ${deleteTarget.lastName}` }));
 closeDeleteDialog();
 load(page);
 } catch {
 toast.error(t('adminUsers.failedDelete'));
 } finally {
 setDeleting(false);
 }
 };

 const expectedName = deleteTarget
 ? `${deleteTarget.firstName} ${deleteTarget.lastName}`
 : '';
 const nameMatches = deleteConfirmName.trim() === expectedName;

 const totalPages = Math.ceil(total / 20);

 return (
 <div className="space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('adminUsers.title')}</h1>
 <p className="text-gray-500 dark:text-slate-400">{t('adminUsers.subtitle')}</p>
 </div>

 <form onSubmit={handleSearch} className="flex items-center gap-3">
 <div className="relative flex-1 max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
 <Input
 placeholder={t('adminUsers.searchPlaceholder')}
 className="pl-10"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>
 <Select
 value={roleFilter}
 onChange={(e) => { setRoleFilter(e.target.value); }}
 className="w-40"
 >
 <option value="">{t('adminUsers.allRoles')}</option>
 <option value="ADMIN">{t('adminUsers.admin')}</option>
 <option value="TEACHER">{t('adminUsers.teacher')}</option>
 <option value="STUDENT">{t('adminUsers.student')}</option>
 </Select>
 <Button type="submit">{t('common.search')}</Button>
 </form>

 {loading ? (
 <div className="space-y-3">
 {[1, 2, 3, 4].map((i) => (
 <Skeleton key={i} className="h-16 w-full rounded-xl" />
 ))}
 </div>
 ) : users.length === 0 ? (
 <EmptyState
 icon={<Users size={48} />}
 title={t('adminUsers.noUsers')}
 description={t('adminUsers.noUsersDesc')}
 />
 ) : (
 <Card>
 <CardHeader>
 <CardTitle className="text-base">{t('adminUsers.totalUsers', { count: total })}</CardTitle>
 </CardHeader>
 <CardContent className="p-0">
 <div className="divide-y divide-gray-100">
 {users.map((u, i) => (
 <div key={u.id} className="flex items-center gap-4 p-4 animate-item-in" style={{ animationDelay: `${i * 40}ms` }}>
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700 shrink-0">
 {roleIcon(u.role)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900 dark:text-slate-100">
 {u.firstName} {u.lastName}
 </p>
 <p className="text-sm text-gray-500 dark:text-slate-400">{u.phone} • {t('common.joined')} {formatDate(u.createdAt)}</p>
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
 <Select
 value={u.role}
 onChange={(e) => changeRole(u.id, e.target.value)}
 className="w-32 h-8 text-xs"
 >
 <option value="STUDENT">{t('adminUsers.student')}</option>
 <option value="TEACHER">{t('adminUsers.teacher')}</option>
 <option value="ADMIN">{t('adminUsers.admin')}</option>
 </Select>
 <Button
 variant="ghost"
 size="icon"
 className="text-gray-400 dark:text-slate-500 hover:text-red-600 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20"
 onClick={() => openDeleteDialog(u)}
 title={t('adminUsers.deleteUser')}
 >
 <Trash2 size={16} />
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
 <span className="text-sm text-gray-500 dark:text-slate-400">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
 <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
 {t('common.next')}
 </Button>
 </div>
 )}

 {/* ── Delete Confirmation Modal ──────────────────────── */}
 {deleteTarget && (
 <div className="fixed inset-0 z-50 flex items-center justify-center">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-black/50 backdrop-blur-sm"
 onClick={closeDeleteDialog}
 />

 {/* Dialog */}
 <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-in">
 <button
 onClick={closeDeleteDialog}
 className="absolute top-4 right-4 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 cursor-pointer"
 >
 <X size={20} />
 </button>

 {deleteStep === 1 ? (
 /* ── Step 1: First confirmation ── */
 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 shrink-0">
 <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('adminUsers.deleteUser')}</h3>
 <p className="text-sm text-gray-500 dark:text-slate-400">{t('adminUsers.cannotBeUndone')}</p>
 </div>
 </div>

 <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 p-4">
 <p className="text-sm text-red-800">
 {t('adminUsers.aboutToDelete', { name: `${deleteTarget.firstName} ${deleteTarget.lastName}`, phone: deleteTarget.phone })}
 </p>
 </div>

 <p className="text-sm text-gray-600 dark:text-slate-400">
 {t('adminUsers.areYouSure')}
 </p>

 <div className="flex items-center justify-end gap-3 pt-2">
 <Button variant="outline" onClick={closeDeleteDialog}>
 {t('common.cancel')}
 </Button>
 <Button variant="destructive" onClick={proceedToStep2}>
 {t('adminUsers.yesContinue')}
 </Button>
 </div>
 </div>
 ) : (
 /* ── Step 2: Type name to confirm ── */
 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40 shrink-0">
 <Trash2 size={20} className="text-red-600 dark:text-red-400" />
 </div>
 <div>
 <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">{t('adminUsers.finalConfirmation')}</h3>
 <p className="text-sm text-gray-500 dark:text-slate-400">{t('adminUsers.typeNameSubtitle')}</p>
 </div>
 </div>

 <div className="rounded-lg bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-4">
 <p className="text-sm text-gray-700 dark:text-slate-300">
 {t('adminUsers.toConfirmType')}{' '}
 <strong className="text-gray-900 dark:text-slate-100 select-all">{expectedName}</strong>
 </p>
 </div>

 <Input
 ref={confirmInputRef}
 placeholder={expectedName}
 value={deleteConfirmName}
 onChange={(e) => setDeleteConfirmName(e.target.value)}
 className={
 deleteConfirmName.length > 0 && !nameMatches
 ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
 : ''
 }
 />

 <div className="flex items-center justify-end gap-3 pt-2">
 <Button variant="outline" onClick={() => setDeleteStep(1)}>
 {t('adminUsers.goBack')}
 </Button>
 <Button
 variant="destructive"
 disabled={!nameMatches || deleting}
 loading={deleting}
 onClick={handleDelete}
 >
 {t('adminUsers.deletePermanently')}
 </Button>
 </div>
 </div>
 )}
 </div>
 </div>
 )}
 </div>
 );
}
