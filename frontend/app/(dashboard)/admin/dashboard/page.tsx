'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { materialsApi, usersApi, subjectsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, truncate } from '@/lib/utils';
import type { Material, Subject } from '@/lib/types';
import {
  FileText,
  Users,
  BookOpen,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Upload,
  ArrowRight,
  TrendingUp,
  Eye,
} from 'lucide-react';

interface DashboardStats {
  totalMaterials: number;
  pendingReview: number;
  published: number;
  failed: number;
  totalUsers: number;
  totalSubjects: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentMaterials, setRecentMaterials] = useState<Material[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [matAll, matPending, matPublished, matFailed, usersRes, subjectsRes] =
          await Promise.all([
            materialsApi.list({ page: 1, limit: 1 }),
            materialsApi.list({ page: 1, limit: 5, status: 'PROCESSED' }),
            materialsApi.list({ page: 1, limit: 1, status: 'PUBLISHED' }),
            materialsApi.list({ page: 1, limit: 1, status: 'FAILED' }),
            usersApi.list({ page: 1, limit: 1 }),
            subjectsApi.list(1, 100),
          ]);

        setStats({
          totalMaterials: matAll.data.meta?.total ?? matAll.data.total ?? 0,
          pendingReview: matPending.data.meta?.total ?? matPending.data.total ?? 0,
          published: matPublished.data.meta?.total ?? matPublished.data.total ?? 0,
          failed: matFailed.data.meta?.total ?? matFailed.data.total ?? 0,
          totalUsers: usersRes.data.meta?.total ?? usersRes.data.total ?? 0,
          totalSubjects: subjectsRes.data.meta?.total ?? subjectsRes.data.data?.length ?? 0,
        });

        // Recent materials
        const recentRes = await materialsApi.list({ page: 1, limit: 5 });
        setRecentMaterials(recentRes.data.data ?? recentRes.data ?? []);

        // Pending review
        setPendingMaterials(matPending.data.data ?? matPending.data ?? []);

        // Subjects
        setSubjects(subjectsRes.data.data ?? subjectsRes.data ?? []);
      } catch (err) {
        console.error('Failed to load admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusColor = (status: string) => {
    const map: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
      PENDING: 'warning',
      PROCESSING: 'default',
      PROCESSED: 'default',
      REVIEWED: 'secondary',
      PUBLISHED: 'success',
      FAILED: 'destructive',
    };
    return map[status] ?? 'secondary';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Materials',
      value: stats?.totalMaterials ?? 0,
      icon: <FileText size={20} />,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Pending Review',
      value: stats?.pendingReview ?? 0,
      icon: <Clock size={20} />,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Published',
      value: stats?.published ?? 0,
      icon: <CheckCircle2 size={20} />,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Failed',
      value: stats?.failed ?? 0,
      icon: <AlertTriangle size={20} />,
      color: 'text-red-600 bg-red-50',
    },
    {
      label: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: <Users size={20} />,
      color: 'text-violet-600 bg-violet-50',
    },
    {
      label: 'Subjects',
      value: stats?.totalSubjects ?? 0,
      icon: <BookOpen size={20} />,
      color: 'text-cyan-600 bg-cyan-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">Platform overview and quick actions</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/admin/upload">
            <Button>
              <Upload size={16} />
              Upload Material
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className={`rounded-lg p-2.5 ${stat.color}`}>{stat.icon}</div>
                <TrendingUp size={14} className="text-gray-300" />
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Review */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Pending Review
            </CardTitle>
            <Link href="/admin/materials">
              <Button variant="ghost" size="sm">
                View All <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {pendingMaterials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No materials pending review
              </p>
            ) : (
              <div className="space-y-3">
                {pendingMaterials.map((m) => (
                  <Link
                    key={m.id}
                    href={`/admin/materials/${m.id}`}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-600 shrink-0">
                      <Eye size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.metadata?.title || m.originalName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {m.subject?.name} • {formatDate(m.createdAt)}
                      </p>
                    </div>
                    <Badge variant={statusColor(m.status)} className="shrink-0">
                      {m.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Materials */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} className="text-blue-500" />
              Recent Materials
            </CardTitle>
            <Link href="/admin/materials">
              <Button variant="ghost" size="sm">
                View All <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentMaterials.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No materials yet</p>
            ) : (
              <div className="space-y-3">
                {recentMaterials.map((m) => (
                  <Link
                    key={m.id}
                    href={`/admin/materials/${m.id}`}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 shrink-0">
                      <FileText size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.metadata?.title || m.originalName}
                      </p>
                      <p className="text-xs text-gray-400">
                        {m.subject?.name} • {formatDate(m.createdAt)}
                      </p>
                    </div>
                    <Badge variant={statusColor(m.status)} className="shrink-0">
                      {m.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Subjects */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/admin/upload" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Upload size={16} className="text-blue-600" />
                Upload Material
              </Button>
            </Link>
            <Link href="/admin/subjects" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <BookOpen size={16} className="text-green-600" />
                Manage Subjects
              </Button>
            </Link>
            <Link href="/admin/users" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Users size={16} className="text-violet-600" />
                Manage Users
              </Button>
            </Link>
            <Link href="/admin/materials" className="block">
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText size={16} className="text-amber-600" />
                Review Materials
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Subjects Overview */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={18} className="text-cyan-500" />
              Subjects
            </CardTitle>
            <Link href="/admin/subjects">
              <Button variant="ghost" size="sm">
                Manage <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No subjects created yet</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {subjects.slice(0, 6).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 p-3"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      {s.code && (
                        <p className="text-xs text-gray-400">{s.code}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
