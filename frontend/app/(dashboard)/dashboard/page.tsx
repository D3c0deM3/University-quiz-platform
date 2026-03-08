'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { searchApi, quizzesApi, subjectsApi } from '@/lib/api';
import type { Material, QuizStats, Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  BookOpen,
  Search,
  ClipboardList,
  TrendingUp,
  FileText,
  ArrowRight,
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentMaterials, setRecentMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [materialsRes, subjectsRes, statsRes] = await Promise.all([
          searchApi.search({ sort: 'date', order: 'desc', limit: 5 }),
          subjectsApi.list(1, 6),
          quizzesApi.myStats(),
        ]);
        setRecentMaterials(materialsRes.data.data || []);
        setSubjects(subjectsRes.data.data || subjectsRes.data || []);
        setStats(statsRes.data);
      } catch {
        // silent — dashboard is best-effort
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Hello, {user?.firstName}! Here&apos;s your learning overview.
        </p>
      </div>

      {/* Quick Search */}
      <Card>
        <CardContent className="py-6">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <Input
                placeholder="Search materials, topics, keywords…"
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <ClipboardList size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : stats?.totalAttempts ?? 0}
              </p>
              <p className="text-sm text-gray-500">Quizzes Taken</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : '0%'}
              </p>
              <p className="text-sm text-gray-500">Average Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <BookOpen size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : Array.isArray(subjects) ? subjects.length : 0}
              </p>
              <p className="text-sm text-gray-500">Subjects</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
              <FileText size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '—' : recentMaterials.length}
              </p>
              <p className="text-sm text-gray-500">Recent Materials</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Recent Materials + Subjects */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Materials */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Materials</CardTitle>
            <Link href="/search">
              <Button variant="ghost" size="sm">
                View all <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentMaterials.length === 0 ? (
              <EmptyState
                title="No materials yet"
                description="Published materials will appear here"
                className="py-8"
              />
            ) : (
              <div className="space-y-3">
                {recentMaterials.map((m) => (
                  <Link
                    key={m.id}
                    href={`/materials/${m.id}`}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-gray-100">
                      <FileText size={16} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {m.metadata?.title || m.originalName}
                      </p>
                      <p className="text-xs text-gray-500">
                        {m.fileType.toUpperCase()} • {m.subject?.name || ''}
                      </p>
                    </div>
                    {m.metadata?.difficultyLevel && (
                      <Badge variant="secondary" className="shrink-0">
                        {m.metadata.difficultyLevel}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subjects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subjects</CardTitle>
            <Link href="/subjects">
              <Button variant="ghost" size="sm">
                View all <ArrowRight size={14} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : !Array.isArray(subjects) || subjects.length === 0 ? (
              <EmptyState
                title="No subjects"
                description="Subjects will appear here once created"
                className="py-8"
              />
            ) : (
              <div className="space-y-2">
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    href={`/subjects/${s.id}`}
                    className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-50">
                      <BookOpen size={16} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      {s.description && (
                        <p className="text-xs text-gray-500 truncate">{s.description}</p>
                      )}
                    </div>
                    {s.code && (
                      <Badge variant="outline" className="shrink-0">
                        {s.code}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Stats */}
      {stats && stats.subjectStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.subjectStats.map((ss) => (
                <div
                  key={ss.subjectId}
                  className="rounded-lg border border-gray-200 p-4"
                >
                  <p className="font-medium text-gray-900">{ss.subjectName}</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-blue-600">{ss.attempts}</p>
                      <p className="text-xs text-gray-500">Attempts</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-green-600">
                        {Math.round(ss.averageScore)}%
                      </p>
                      <p className="text-xs text-gray-500">Average</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-600">
                        {Math.round(ss.bestScore)}%
                      </p>
                      <p className="text-xs text-gray-500">Best</p>
                    </div>
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
