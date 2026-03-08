'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { searchApi, subjectsApi } from '@/lib/api';
import type { Material, Subject } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { Search as SearchIcon, FileText, X, SlidersHorizontal } from 'lucide-react';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [subject, setSubject] = useState(searchParams.get('subject') || '');
  const [difficulty, setDifficulty] = useState(searchParams.get('difficulty') || '');
  const [fileType, setFileType] = useState(searchParams.get('type') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'relevance');
  const [showFilters, setShowFilters] = useState(false);

  const [results, setResults] = useState<Material[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    subjectsApi.list(1, 100).then((res) => {
      setSubjects(res.data.data || res.data || []);
    });
  }, []);

  const doSearch = useCallback(
    async (p = 1) => {
      setLoading(true);
      try {
        const params: Record<string, string | number | undefined> = {
          page: p,
          limit: 20,
          sort,
          order: 'desc',
        };
        if (query.trim()) params.q = query.trim();
        if (subject) params.subject = subject;
        if (difficulty) params.difficulty = difficulty;
        if (fileType) params.type = fileType;

        const { data } = await searchApi.search(params);
        setResults(data.data || []);
        setTotal(data.meta?.total || 0);
        setPage(p);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    },
    [query, subject, difficulty, fileType, sort],
  );

  // Auto-search on mount if query params exist
  useEffect(() => {
    if (searchParams.get('q')) {
      doSearch(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (subject) params.set('subject', subject);
    if (difficulty) params.set('difficulty', difficulty);
    if (fileType) params.set('type', fileType);
    params.set('sort', sort);
    router.push(`/search?${params.toString()}`);
    doSearch(1);
  };

  const clearFilters = () => {
    setSubject('');
    setDifficulty('');
    setFileType('');
    setSort('relevance');
  };

  const hasFilters = subject || difficulty || fileType;
  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-gray-500">Find materials across all subjects</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input
              placeholder="Search by title, summary, keywords, topics…"
              className="pl-10"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal size={16} />
            Filters
            {hasFilters && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs text-white">
                {[subject, difficulty, fileType].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button type="submit" loading={loading}>
            Search
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Subject</label>
                <Select value={subject} onChange={(e) => setSubject(e.target.value)}>
                  <option value="">All subjects</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Difficulty</label>
                <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                  <option value="">Any difficulty</option>
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">File type</label>
                <Select value={fileType} onChange={(e) => setFileType(e.target.value)}>
                  <option value="">Any type</option>
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="pptx">PPTX</option>
                  <option value="png">Image</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-500">Sort by</label>
                <Select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="relevance">Relevance</option>
                  <option value="date">Date (newest)</option>
                  <option value="title">Title (A-Z)</option>
                </Select>
              </div>
              {hasFilters && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
                    <X size={14} /> Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </form>

      {/* Results */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 && (query || hasFilters) ? (
        <EmptyState
          icon={<SearchIcon size={48} />}
          title="No results found"
          description="Try adjusting your search or filters"
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon={<SearchIcon size={48} />}
          title="Start searching"
          description="Enter a query or apply filters to find materials"
        />
      ) : (
        <>
          <p className="text-sm text-gray-500">
            {total} result{total !== 1 ? 's' : ''} found
          </p>
          <div className="space-y-3">
            {results.map((m) => (
              <Link key={m.id} href={`/materials/${m.id}`}>
                <Card className="transition-shadow hover:shadow-md cursor-pointer">
                  <CardContent className="flex gap-4 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 shrink-0">
                      <FileText size={20} className="text-gray-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900">
                        {m.metadata?.title || m.originalName}
                      </h3>
                      {m.metadata?.summary && (
                        <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                          {m.metadata.summary}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Badge variant="secondary">{m.fileType.toUpperCase()}</Badge>
                        {m.subject?.name && <Badge variant="default">{m.subject.name}</Badge>}
                        {m.metadata?.difficultyLevel && (
                          <Badge
                            variant={
                              m.metadata.difficultyLevel === 'BEGINNER'
                                ? 'success'
                                : m.metadata.difficultyLevel === 'INTERMEDIATE'
                                ? 'warning'
                                : 'destructive'
                            }
                          >
                            {m.metadata.difficultyLevel}
                          </Badge>
                        )}
                        {m.metadata?.keywords?.slice(0, 3).map((kw) => (
                          <Badge key={kw} variant="outline">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => doSearch(page - 1)}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => doSearch(page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-12 w-full" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
