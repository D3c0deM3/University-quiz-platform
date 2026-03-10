'use client';

import { useEffect, useState, useRef } from 'react';
import { usersApi } from '@/lib/api';
import type { User, Role } from '@/lib/types';
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

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number | undefined> = { page: p, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await usersApi.list(params as { page?: number; limit?: number; role?: string; search?: string });
      setUsers(data.data || []);
      setTotal(data.meta?.total || 0);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const changeRole = async (userId: string, newRole: string) => {
    try {
      await usersApi.assignRole(userId, newRole);
      toast.success('Role updated');
      load(page);
    } catch {
      toast.error('Failed to update role');
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
      toast.success(`User "${deleteTarget.firstName} ${deleteTarget.lastName}" has been deleted`);
      closeDeleteDialog();
      load(page);
    } catch {
      toast.error('Failed to delete user');
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
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500">Manage platform users and roles</p>
      </div>

      <form onSubmit={handleSearch} className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search by name or email…"
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
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option>
        </Select>
        <Button type="submit">Search</Button>
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
          title="No users found"
          description="No users match your search criteria"
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{total} users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {users.map((u) => (
                <div key={u.id} className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 shrink-0">
                    {roleIcon(u.role)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{u.phone} • Joined {formatDate(u.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                    <Select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="w-32 h-8 text-xs"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher</option>
                      <option value="ADMIN">Admin</option>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => openDeleteDialog(u)}
                      title="Delete user"
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
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
            Next
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
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 animate-fade-in">
            <button
              onClick={closeDeleteDialog}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={20} />
            </button>

            {deleteStep === 1 ? (
              /* ── Step 1: First confirmation ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 shrink-0">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Delete User</h3>
                    <p className="text-sm text-gray-500">This action cannot be undone</p>
                  </div>
                </div>

                <div className="rounded-lg bg-red-50 border border-red-100 p-4">
                  <p className="text-sm text-red-800">
                    You are about to permanently delete{' '}
                    <strong>{deleteTarget.firstName} {deleteTarget.lastName}</strong>{' '}
                    ({deleteTarget.phone}).
                    All their data, quiz attempts, and subscriptions will be removed.
                  </p>
                </div>

                <p className="text-sm text-gray-600">
                  Are you sure you want to proceed?
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={closeDeleteDialog}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={proceedToStep2}>
                    Yes, continue
                  </Button>
                </div>
              </div>
            ) : (
              /* ── Step 2: Type name to confirm ── */
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 shrink-0">
                    <Trash2 size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Final Confirmation</h3>
                    <p className="text-sm text-gray-500">Type the user&apos;s full name to confirm</p>
                  </div>
                </div>

                <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
                  <p className="text-sm text-gray-700">
                    To confirm deletion, type:{' '}
                    <strong className="text-gray-900 select-all">{expectedName}</strong>
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
                    Go back
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={!nameMatches || deleting}
                    loading={deleting}
                    onClick={handleDelete}
                  >
                    Delete permanently
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
