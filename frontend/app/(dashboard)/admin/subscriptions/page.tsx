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
      toast.error('Failed to load subscriptions');
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
        toast.error('No student found with that number');
      }
    } catch {
      toast.error('Search failed');
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
      toast.error('Select a student and at least one subject');
      return;
    }
    setAssigning(true);
    try {
      await subscriptionsApi.bulkAssign({
        userId: selectedUserId,
        subjectIds: selectedSubjectIds,
      });
      toast.success(`Assigned ${selectedSubjectIds.length} subject(s) successfully`);
      setSelectedUserId('');
      setSelectedSubjectIds([]);
      setSelectedUser(null);
      setPhoneSearch('');
      setPhoneResults([]);
      setShowAssignForm(false);
      await loadSubscriptions();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to assign';
      toast.error(msg);
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (sub: Subscription) => {
    if (!confirm(`Revoke ${sub.subject?.name || 'subscription'} for ${sub.user?.firstName || 'user'}?`)) return;
    try {
      await subscriptionsApi.revoke(sub.id);
      toast.success('Subscription revoked');
      await loadSubscriptions();
    } catch {
      toast.error('Failed to revoke');
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
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
          <p className="text-gray-500">Manage student subject access</p>
        </div>
        <Button onClick={() => setShowAssignForm(!showAssignForm)}>
          <UserPlus size={16} className="mr-2" />
          Assign Subscription
        </Button>
      </div>

      {/* Assign form */}
      {showAssignForm && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-base">Assign Subject Access</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Phone search */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Search Student by Phone</label>
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
                  {phoneSearching ? 'Searching…' : 'Search'}
                </Button>
              </div>
              {/* Search results */}
              {phoneResults.length > 0 && (
                <div className="mt-2 rounded-lg border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
                  {phoneResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => selectUser(u)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-medium text-xs">
                        {u.firstName?.[0]}{u.lastName?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-gray-500">{u.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {/* Selected user indicator */}
              {selectedUser && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm">
                  <CheckCircle size={16} className="text-green-600" />
                  <span className="font-medium text-green-800">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </span>
                  <span className="text-green-600">{selectedUser.phone}</span>
                </div>
              )}
            </div>

            {/* Subject checkboxes */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Subjects ({selectedSubjectIds.length} selected)
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
                          ? 'border-blue-500 bg-blue-50 text-blue-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border ${
                          checked ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}
                      >
                        {checked && <CheckCircle size={14} className="text-white" />}
                      </div>
                      <BookOpen size={14} className="shrink-0" />
                      <span className="truncate">{s.name}</span>
                      {s.code && <span className="text-xs text-gray-400 shrink-0">({s.code})</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAssign} disabled={assigning}>
                {assigning ? 'Assigning…' : 'Assign Access'}
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
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Search user or subject…"
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-40">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PENDING">Pending</option>
          <option value="EXPIRED">Expired</option>
          <option value="REVOKED">Revoked</option>
        </Select>
      </div>

      {/* Subscriptions list */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<CreditCard size={48} />}
          title="No subscriptions found"
          description="Assign subjects to students using the button above"
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {filtered.map((sub) => (
                <div key={sub.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                    <CreditCard size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {sub.user?.firstName} {sub.user?.lastName}
                      <span className="text-gray-400 font-normal ml-2 text-sm">{sub.user?.phone}</span>
                    </p>
                    <p className="text-sm text-gray-500">
                      {sub.subject?.name}
                      {sub.subject?.code && <span className="ml-1 text-gray-400">({sub.subject.code})</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={statusVariant(sub.status)}>{sub.status}</Badge>
                    <span className="text-xs text-gray-400">{formatDate(sub.createdAt)}</span>
                    {sub.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleRevoke(sub)}
                        className="text-red-400 hover:text-red-600 transition-colors cursor-pointer"
                        title="Revoke"
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
