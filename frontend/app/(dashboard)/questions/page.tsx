'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { questionsApi, subjectsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { ManualQuestion, Subject } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { HelpCircle, Plus, Search, ChevronLeft, ChevronRight, Image, User } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function QuestionsPage() {
  const { user } = useAuthStore();
  const [questions, setQuestions] = useState<ManualQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [search, setSearch] = useState('');
  const [showMine, setShowMine] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    subjectsApi.list(1, 100).then((res) => {
      setSubjects(res.data.data || res.data || []);
    });
  }, []);

  const load = async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: 20 };
      if (subjectId) params.subjectId = subjectId;
      if (search.trim()) params.search = search.trim();
      if (showMine) params.mine = 'true';
      const { data } = await questionsApi.list(params);
      setQuestions(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
      setPage(p);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, showMine]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED': return <Badge variant="success">Approved</Badge>;
      case 'PENDING': return <Badge variant="warning">Pending</Badge>;
      case 'REJECTED': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questions & Answers</h1>
          <p className="text-gray-500">Browse and contribute Q&A for your subjects</p>
        </div>
        <Link href="/questions/create">
          <Button>
            <Plus size={16} className="mr-2" /> Add Question
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Search questions…"
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <Select
          value={subjectId}
          onChange={(e) => { setSubjectId(e.target.value); setPage(1); }}
          className="w-48"
        >
          <option value="">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
        <Button
          variant={showMine ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowMine(!showMine)}
        >
          <User size={14} className="mr-1" /> My Questions
        </Button>
        <span className="text-sm text-gray-500">{total} questions</span>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<HelpCircle size={48} />}
          title="No questions found"
          description={showMine ? "You haven't created any questions yet" : 'Be the first to add a question!'}
          action={
            <Link href="/questions/create">
              <Button>Add Question</Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card
              key={q.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  {/* Icon / Image indicator */}
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                    {q.imagePath ? (
                      <Image size={20} className="text-blue-600" />
                    ) : (
                      <HelpCircle size={20} className="text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(q.status)}
                      <Badge variant="outline">{q.subject?.name || 'Unknown'}</Badge>
                    </div>
                    <p className="font-medium text-gray-900">{q.questionText}</p>

                    {/* Expanded: show answer + image */}
                    {expandedId === q.id && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                          <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">Answer</p>
                          <p className="text-gray-800 whitespace-pre-wrap">{q.answerText}</p>
                        </div>
                        {q.imagePath && (
                          <div>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Image</p>
                            <img
                              src={`${API_BASE}/uploads/question-images/${q.imagePath.split('/').pop()}`}
                              alt="Question"
                              className="max-w-full max-h-64 rounded-lg border"
                            />
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          By {q.createdBy?.firstName} {q.createdBy?.lastName} • {new Date(q.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  );
}
