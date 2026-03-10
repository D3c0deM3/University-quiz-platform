'use client';

import { useEffect, useState, useCallback } from 'react';
import { subscriptionsApi, usersApi, subjectsApi } from '@/lib/api';
import type { User, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import { CreditCard, Search, UserPlus, Trash2, BookOpen, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface Subscription {
 id: string;
 userId: string;
 subjectId: string;
 status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REVOKED';
 expiresAt: string | null;
 createdAt: string;
 updatedAt: string;
 user?: { id: string; firstName: string; lastName: string; phone: string };
 subject?: { id: string; name: string; code: string | null };
}

const statusVariant = (status: string) => {
 switch (status) {
 case 'ACTIVE': return 'success' as const;
 case 'PENDING': return 'warning' as const;
 case 'EXPIRED': return 'secondary' as const;
 case 'REVOKED': return 'destructive' as const;
 default: return 'default' as const;
 }
};

export default function AdminSubscriptionsPage() {
 const { t } = useTranslation();
 const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [loading, setLoading] = useState(true);
 const [statusFilter, setStatusFilter] = useState('');
 const [searchTerm, setSearchTerm] = useState('');

 // Assign form state
 const [selectedUserId, setSelectedUserId] = useState('');
 const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
 const [assigning, setAssigning] = useState(false);
 const [showAssignForm, setShowAssignForm] = useState(false);

 // Phone search state
 const [phoneSearch, setPhoneSearch] = useState('');
 const [phoneResults, setPhoneResults] = useState<User[]>([]);
 const [phoneSearching, setPhoneSearching] = useState(false);
 const [selectedUser, setSelectedUser] = useState<User | null>(null);

 const loadSubscriptions = useCallback(async () => {
 try {
 const params: Record<string, string | number | undefined> = { limit: 200 };
 if (statusFilter) params.status = statusFilter;
 const { data } = await subscriptionsApi.list(params as { page?: number; limit?: number; status?: string });
 setSubscriptions(data.data || data || []);
 } catch {
 toast.error(t('adminSubs.noSubs'));
 }
 }, [statusFilter]);

 const loadMeta = useCallback(async () => {
 try {
 const subjectsRes = await subjectsApi.list(1, 200);
 setSubjects(subjectsRes.data.data || subjectsRes.data || []);
 } catch {
 // ignore
 }
 }, []);

 useEffect(() => {
 Promise.all([loadSubscriptions(), loadMeta()]).finally(() => setLoading(false));
 }, [loadSubscriptions, loadMeta]);

 useEffect(() => {
 loadSubscriptions();
 }, [statusFilter, loadSubscriptions]);

 const handlePhoneSearch = async () => {
 if (!phoneSearch.trim()) return;
 setPhoneSearching(true);
 try {
 const { data } = await usersApi.list({ search: phoneSearch.trim(), role: 'STUDENT', limit: 10 });
 setPhoneResults(data.data || []);
 if ((data.data || []).length === 0) {
 toast.error(t('adminSubs.noSubs'));
 }
 } catch {
 toast.error(t('common.search'));
 } finally {
 setPhoneSearching(false);
 }
 };

 const selectUser = (user: User) => {
 setSelectedUser(user);
 setSelectedUserId(user.id);
 setPhoneResults([]);
 setPhoneSearch(user.phone || '');
 };

 const handleAssign = async () => {
 if (!selectedUserId || selectedSubjectIds.length === 0) {
 toast.error(t('adminSubs.selectSubjects'));
 return;
 }
 setAssigning(true);
 try {
 await subscriptionsApi.bulkAssign({
 userId: selectedUserId,
 subjectIds: selectedSubjectIds,
 });
 toast.success(t('adminSubs.assign'));
 setSelectedUserId('');
 setSelectedSubjectIds([]);
 setSelectedUser(null);
 setPhoneSearch('');
 setPhoneResults([]);
 setShowAssignForm(false);
 await loadSubscriptions();
 } catch (err: unknown) {
 const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || t('adminSubs.assign');
 toast.error(msg);
 } finally {
 setAssigning(false);
 }
 };

 const handleRevoke = async (sub: Subscription) => {
 if (!confirm(`${t('adminSubs.revoke')} ${sub.subject?.name || t('adminSubs.subject')} - ${sub.user?.firstName || t('adminSubs.user')}?`)) return;
 try {
 await subscriptionsApi.revoke(sub.id);
 toast.success(t('adminSubs.revoke'));
 await loadSubscriptions();
 } catch {
 toast.error(t('adminSubs.revoke'));
 }
 };

 const toggleSubject = (subjectId: string) => {
 setSelectedSubjectIds((prev) =>
 prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId],
 );
 };

 // Filter subscriptions by search term
 const filtered = subscriptions.filter((s) => {
 if (!searchTerm) return true;
 const q = searchTerm.toLowerCase();
 return (
 s.user?.firstName?.toLowerCase().includes(q) ||
 s.user?.lastName?.toLowerCase().includes(q) ||
 s.user?.phone?.toLowerCase().includes(q) ||
 s.user?.phone?.toLowerCase().includes(q) ||
 s.subject?.name?.toLowerCase().includes(q) ||
 s.subject?.code?.toLowerCase().includes(q)
 );
 });

 if (loading) {
 return (
 <div className="space-y-6">
 <Skeleton className="h-8 w-64" />
 <div className="space-y-3">
 {[1, 2, 3, 4].map((i) => (
 <Skeleton key={i} className="h-16 w-full rounded-xl" />
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('adminSubs.title')}</h1>
 <p className="text-gray-500 dark:text-slate-400">{t('adminSubs.subtitle')}</p>
 </div>
 <Button onClick={() => setShowAssignForm(!showAssignForm)}>
 <UserPlus size={16} className="mr-2" />
 {t('adminSubs.assignSubjects')}
 </Button>
 </div>

 {/* Assign form */}
 {showAssignForm && (
 <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/30">
 <CardHeader>
 <CardTitle className="text-base">{t('adminSubs.assignSubjects')}</CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {/* Phone search */}
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">{t('adminSubs.selectUser')}</label>
 <div className="flex gap-2">
 <Input
 type="tel"
 placeholder="+998901234567"
 value={phoneSearch}
 onChange={(e) => {
 setPhoneSearch(e.target.value);
 if (selectedUser) {
 setSelectedUser(null);
 setSelectedUserId('');
 }
 }}
 onKeyDown={(e) => e.key === 'Enter' && handlePhoneSearch()}
 />
 <Button type="button" variant="outline" onClick={handlePhoneSearch} disabled={phoneSearching}>
 {phoneSearching ? `${t('common.search')}…` : t('common.search')}
 </Button>
 </div>
 {/* Search results */}
 {phoneResults.length > 0 && (
 <div className="mt-2 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm divide-y divide-gray-100">
 {phoneResults.map((u) => (
 <button
 key={u.id}
 type="button"
 onClick={() => selectUser(u)}
 className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
 >
 <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium text-xs">
 {u.firstName?.[0]}{u.lastName?.[0]}
 </div>
 <div>
 <p className="font-medium text-gray-900 dark:text-slate-100">{u.firstName} {u.lastName}</p>
 <p className="text-xs text-gray-500 dark:text-slate-400">{u.phone}</p>
 </div>
 </button>
 ))}
 </div>
 )}
 {/* Selected user indicator */}
 {selectedUser && (
 <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 dark:bg-green-900/20 px-3 py-2 text-sm">
 <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
 <span className="font-medium text-green-800">
 {selectedUser.firstName} {selectedUser.lastName}
 </span>
 <span className="text-green-600 dark:text-green-400">{selectedUser.phone}</span>
 </div>
 )}
 </div>

 {/* Subject checkboxes */}
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
 {t('adminSubs.selectSubjects')} ({selectedSubjectIds.length})
 </label>
 <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
 {subjects.map((s) => {
 const checked = selectedSubjectIds.includes(s.id);
 return (
 <button
 key={s.id}
 type="button"
 onClick={() => toggleSubject(s.id)}
 className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors cursor-pointer ${
 checked
 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-800'
 : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:border-gray-300 dark:border-slate-600'
 }`}
 >
 <div
 className={`flex h-5 w-5 items-center justify-center rounded border ${
 checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300 dark:border-slate-600'
 }`}
 >
 {checked && <CheckCircle size={14} className="text-white" />}
 </div>
 <BookOpen size={14} className="shrink-0" />
 <span className="truncate">{s.name}</span>
 {s.code && <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">({s.code})</span>}
 </button>
 );
 })}
 </div>
 </div>

 <div className="flex gap-2">
 <Button onClick={handleAssign} disabled={assigning}>
 {assigning ? `${t('adminSubs.assign')}…` : t('adminSubs.assign')}
 </Button>
 <Button
 variant="outline"
 onClick={() => {
 setShowAssignForm(false);
 setSelectedUserId('');
 setSelectedSubjectIds([]);
 setSelectedUser(null);
 setPhoneSearch('');
 setPhoneResults([]);
 }}
 >
 {t('common.cancel')}
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Filters */}
 <div className="flex gap-3">
 <div className="relative max-w-xs flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
 <Input
 placeholder={t('adminSubs.searchPlaceholder')}
 className="pl-9"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>
 <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
 <option value="">{t('adminSubs.allStatuses')}</option>
 <option value="ACTIVE">{t('adminSubs.active')}</option>
 <option value="PENDING">{t('common.pending')}</option>
 <option value="EXPIRED">{t('adminSubs.expired')}</option>
 <option value="REVOKED">{t('adminSubs.revoked')}</option>
 </Select>
 </div>

 {/* Subscriptions list */}
 {filtered.length === 0 ? (
 <EmptyState
 icon={<CreditCard size={48} />}
 title={t('adminSubs.noSubs')}
 description={t('adminSubs.subtitle')}
 />
 ) : (
 <Card>
 <CardContent className="p-0">
 <div className="divide-y divide-gray-100">
 {filtered.map((sub) => (
 <div key={sub.id} className="flex items-center gap-4 px-6 py-4">
 <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-700">
 <CreditCard size={18} className="text-gray-500 dark:text-slate-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900 dark:text-slate-100">
 {sub.user?.firstName} {sub.user?.lastName}
 <span className="text-gray-400 dark:text-slate-500 font-normal ml-2 text-sm">{sub.user?.phone}</span>
 </p>
 <p className="text-sm text-gray-500 dark:text-slate-400">
 {sub.subject?.name}
 {sub.subject?.code && <span className="ml-1 text-gray-400 dark:text-slate-500">({sub.subject.code})</span>}
 </p>
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
 <span className="text-xs text-gray-400 dark:text-slate-500">{formatDate(sub.createdAt)}</span>
 {sub.status === 'ACTIVE' && (
 <button
 onClick={() => handleRevoke(sub)}
 className="text-red-400 hover:text-red-600 dark:text-red-400 transition-colors cursor-pointer"
 title={t('adminSubs.revoke')}
 >
 <Trash2 size={16} />
 </button>
 )}
 </div>
 </div>
 ))}
 </div>
 </CardContent>
 </Card>
 )}
 </div>
 );
}
