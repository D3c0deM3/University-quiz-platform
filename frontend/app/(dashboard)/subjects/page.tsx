'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { subjectsApi } from '@/lib/api';
import type { Subject } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { BookOpen, Search, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [filtered, setFiltered] = useState<Subject[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    subjectsApi.list(1, 100).then((res) => {
      const data = res.data.data || res.data || [];
      setSubjects(data);
      setFiltered(data);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(subjects);
    } else {
      const q = search.toLowerCase();
      setFiltered(subjects.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q)
      ));
    }
  }, [search, subjects]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500">Browse all available subjects</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Filter subjects…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No subjects found"
          description={search ? 'Try a different search term' : 'No subjects have been created yet'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((subject) => (
            <Link key={subject.id} href={`/subjects/${subject.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
                <CardContent className="flex flex-col gap-3 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                      <BookOpen size={20} className="text-blue-600" />
                    </div>
                    {subject.code && (
                      <Badge variant="outline">{subject.code}</Badge>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                    {subject.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                        {subject.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-auto flex items-center text-sm text-blue-600 font-medium">
                    View materials <ArrowRight size={14} className="ml-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
