'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { searchApi, quizzesApi, subjectsApi } from '@/lib/api';
import { useDebounce } from '@/lib/useDebounce';
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
import { useTranslation } from '@/lib/i18n';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentMaterials, setRecentMaterials] = useState<Material[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Live search state
  const [searchResults, setSearchResults] = useState<Material[]>([]);
  const [searchSubjects, setSearchSubjects] = useState<Subject[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 350);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Live search: fetch results as user types
  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setSearchResults([]);
      setSearchSubjects([]);
      setShowDropdown(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setSearchLoading(true);
      try {
        const [materialsRes, subjectsRes] = await Promise.all([
          searchApi.search({ q: debouncedQuery.trim(), limit: 5 }),
          subjectsApi.list(1, 5, debouncedQuery.trim()),
        ]);
        if (!cancelled) {
          setSearchResults(materialsRes.data.data || []);
          setSearchSubjects(subjectsRes.data.data || subjectsRes.data || []);
          setShowDropdown(true);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setSearchLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="text-xs sm:text-base text-gray-500 truncate">
          {t('dashboard.greeting', { name: user?.firstName || '' })}
        </p>
      </div>

      {/* Quick Search */}
      <Card>
        <CardContent className="p-3 sm:py-6 sm:p-6">
          <div ref={dropdownRef} className="relative">
            <form onSubmit={handleSearch} className="flex gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <Input
                  placeholder={t('dashboard.searchPlaceholder')}
                  className="pl-9 sm:pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => { if (searchResults.length > 0 || searchSubjects.length > 0) setShowDropdown(true); }}
                />
              </div>
              <Button type="submit" size="sm" className="shrink-0 sm:size-default">{t('common.search')}</Button>
            </form>

            {/* Live search dropdown */}
            {showDropdown && (searchResults.length > 0 || searchSubjects.length > 0 || searchLoading) && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border bg-white shadow-lg overflow-hidden animate-dropdown-in">
                {searchLoading && searchResults.length === 0 && searchSubjects.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-400">{t('common.loading')}...</div>
                ) : (
                  <>
                    {/* Subject results */}
                    {searchSubjects.length > 0 && (
                      <div>
                        <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                          {t('subjects.title')}
                        </div>
                        {searchSubjects.map((s, i) => (
                          <Link
                            key={s.id}
                            href={`/subjects/${s.id}`}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-b-0 animate-item-in"
                            style={{ animationDelay: `${i * 40}ms` }}
                          >
                            <BookOpen size={16} className="text-blue-500 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">{s.name}</p>
                              {s.description && (
                                <p className="text-xs text-gray-500 truncate">{s.description}</p>
                              )}
                            </div>
                            <Badge variant="outline" className="shrink-0 text-[10px]">
                              {t('subjects.title')}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                    {/* Material results */}
                    {searchResults.length > 0 && (
                      <div>
                        {searchSubjects.length > 0 && (
                          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-50">
                            {t('sidebar.materials')}
                          </div>
                        )}
                        {searchResults.map((m, i) => (
                          <Link
                            key={m.id}
                            href={`/materials/${m.id}`}
                            onClick={() => setShowDropdown(false)}
                            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors border-b last:border-b-0 animate-item-in"
                            style={{ animationDelay: `${(searchSubjects.length + i) * 40}ms` }}
                          >
                            <FileText size={16} className="text-gray-400 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {m.metadata?.title || m.originalName}
                              </p>
                              {m.subject?.name && (
                                <p className="text-xs text-gray-500">{m.subject.name}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="shrink-0 text-[10px]">
                              {m.fileType?.toUpperCase()}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}
                    <Link
                      href={`/search?q=${encodeURIComponent(searchQuery.trim())}`}
                      onClick={() => setShowDropdown(false)}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50 transition-colors font-medium border-t"
                    >
                      {t('common.search')} &quot;{searchQuery.trim()}&quot;
                      <ArrowRight size={14} />
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 shrink-0 mb-2">
              <ClipboardList size={16} className="text-blue-600 sm:hidden" />
              <ClipboardList size={20} className="text-blue-600 hidden sm:block" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">
              {loading ? '—' : stats?.totalAttempts ?? 0}
            </p>
            <p className="text-[11px] sm:text-sm text-gray-500 leading-tight">{t('dashboard.quizzesTaken')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-100 shrink-0 mb-2">
              <TrendingUp size={16} className="text-green-600 sm:hidden" />
              <TrendingUp size={20} className="text-green-600 hidden sm:block" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">
              {loading ? '—' : stats?.averageScore != null ? `${Math.round(stats.averageScore)}%` : '0%'}
            </p>
            <p className="text-[11px] sm:text-sm text-gray-500 leading-tight">{t('dashboard.avgScore')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-purple-100 shrink-0 mb-2">
              <BookOpen size={16} className="text-purple-600 sm:hidden" />
              <BookOpen size={20} className="text-purple-600 hidden sm:block" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">
              {loading ? '—' : Array.isArray(subjects) ? subjects.length : 0}
            </p>
            <p className="text-[11px] sm:text-sm text-gray-500 leading-tight">{t('dashboard.subjects')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-5">
            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-orange-100 shrink-0 mb-2">
              <FileText size={16} className="text-orange-600 sm:hidden" />
              <FileText size={20} className="text-orange-600 hidden sm:block" />
            </div>
            <p className="text-lg sm:text-2xl font-bold text-gray-900">
              {loading ? '—' : recentMaterials.length}
            </p>
            <p className="text-[11px] sm:text-sm text-gray-500 leading-tight">{t('dashboard.recentMaterials')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column: Recent Materials + Subjects */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Materials */}
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-lg truncate">{t('dashboard.recentMaterials')}</CardTitle>
            <Link href="/search" className="shrink-0">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 px-2 sm:px-3">
                {t('common.viewAll')} <ArrowRight size={12} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 sm:h-14 w-full" />
                ))}
              </div>
            ) : recentMaterials.length === 0 ? (
              <EmptyState
                title={t('dashboard.noMaterials')}
                description={t('dashboard.noMaterialsDesc')}
                className="py-6"
              />
            ) : (
              <div className="space-y-1 sm:space-y-3">
                {recentMaterials.map((m) => (
                  <Link
                    key={m.id}
                    href={`/materials/${m.id}`}
                    className="flex items-center gap-2 sm:gap-3 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded bg-gray-100 shrink-0">
                      <FileText size={14} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                        {m.metadata?.title || m.originalName}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                        {m.fileType.toUpperCase()} • {m.subject?.name || ''}
                      </p>
                    </div>
                    {m.metadata?.difficultyLevel && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2 hidden xs:inline-flex">
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
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-lg truncate">{t('dashboard.subjects')}</CardTitle>
            <Link href="/subjects" className="shrink-0">
              <Button variant="ghost" size="sm" className="text-xs sm:text-sm h-8 px-2 sm:px-3">
                {t('common.viewAll')} <ArrowRight size={12} />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 sm:h-14 w-full" />
                ))}
              </div>
            ) : !Array.isArray(subjects) || subjects.length === 0 ? (
              <EmptyState
                title={t('dashboard.noSubjects')}
                description={t('dashboard.noSubjectsDesc')}
                className="py-6"
              />
            ) : (
              <div className="space-y-1 sm:space-y-2">
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    href={`/subjects/${s.id}`}
                    className="flex items-center gap-2 sm:gap-3 rounded-lg p-2 sm:p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded bg-blue-50 shrink-0">
                      <BookOpen size={14} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{s.name}</p>
                      {s.description && (
                        <p className="text-[10px] sm:text-xs text-gray-500 truncate">{s.description}</p>
                      )}
                    </div>
                    {s.code && (
                      <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs px-1.5 sm:px-2 hidden xs:inline-flex">
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
        <Card className="overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-lg">{t('dashboard.title')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="grid gap-2.5 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.subjectStats.map((ss) => (
                <div
                  key={ss.subjectId}
                  className="rounded-lg border border-gray-200 p-3 sm:p-4"
                >
                  <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{ss.subjectName}</p>
                  <div className="mt-2 grid grid-cols-3 gap-1 sm:gap-2 text-center">
                    <div>
                      <p className="text-sm sm:text-lg font-bold text-blue-600">{ss.totalAttempts}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{t('dashboard.quizzesTaken')}</p>
                    </div>
                    <div>
                      <p className="text-sm sm:text-lg font-bold text-green-600">
                        {Math.round(ss.averageScore)}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{t('dashboard.avgScore')}</p>
                    </div>
                    <div>
                      <p className="text-sm sm:text-lg font-bold text-purple-600">
                        {Math.round(ss.bestScore)}%
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">{t('common.explore')}</p>
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
