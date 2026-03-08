'use client';

import { useEffect, useState } from 'react';
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
import { Users, Search, Shield, GraduationCap, BookOpen } from 'lucide-react';
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
                    <p className="text-sm text-gray-500">{u.email} • Joined {formatDate(u.createdAt)}</p>
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
    </div>
  );
}
