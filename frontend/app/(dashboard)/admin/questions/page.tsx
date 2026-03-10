'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from '@/lib/i18n';
import { questionsApi, subjectsApi } from '@/lib/api';
import { useDebounce } from '@/lib/useDebounce';
import type { ManualQuestion, Subject, QuestionStatus, QuestionStatusCounts } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  HelpCircle,
  Search,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Image,
  Sparkles,
  Trash2,
  Loader2,
  Pencil,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function AdminQuestionsPage() {
  const { t } = useTranslation();

  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: '', label: t('adminQuestions.allStatuses') },
    { value: 'PENDING', label: t('common.pending') },
    { value: 'APPROVED', label: t('common.approved') },
    { value: 'REJECTED', label: t('common.rejected') },
  ];

  const statusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'APPROVED': return <Badge variant="success">{t('common.approved')}</Badge>;
      case 'PENDING': return <Badge variant="warning">{t('common.pending')}</Badge>;
      case 'REJECTED': return <Badge variant="destructive">{t('common.rejected')}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  const [questions, setQuestions] = useState<ManualQuestion[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [counts, setCounts] = useState<QuestionStatusCounts | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');
  const [editSubjectId, setEditSubjectId] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  useEffect(() => {
    subjectsApi.list(1, 100).then((res) => {
      setSubjects(res.data.data || res.data || []);
    });
  }, []);

  const loadCounts = useCallback(async () => {
    try {
      const { data } = await questionsApi.counts(subjectId || undefined);
      setCounts(data);
    } catch {
      // silent
    }
  }, [subjectId]);

  const load = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: p, limit: 20 };
      if (subjectId) params.subjectId = subjectId;
      if (status) params.status = status;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const { data } = await questionsApi.list(params);
      setQuestions(data.data || []);
      setTotal(data.meta?.total || 0);
      setTotalPages(data.meta?.totalPages || 1);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }, [subjectId, status, debouncedSearch]);

  useEffect(() => {
    load();
    loadCounts();
  }, [load, loadCounts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    load(1);
  };

  const handleReview = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      await questionsApi.review(id, newStatus);
      toast.success(t('adminQuestions.questionStatus', { status: newStatus.toLowerCase() }));
      load(page);
      loadCounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('adminQuestions.failedUpdateStatus'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('adminQuestions.confirmDelete'))) return;
    try {
      await questionsApi.delete(id);
      toast.success(t('adminQuestions.questionDeleted'));
      load(page);
      loadCounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('adminQuestions.failedDelete'));
    }
  };

  const startEdit = (q: ManualQuestion) => {
    setEditingId(q.id);
    setEditQuestion(q.questionText);
    setEditAnswer(q.answerText);
    setEditSubjectId(q.subjectId);
    setExpandedId(q.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQuestion('');
    setEditAnswer('');
    setEditSubjectId('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editQuestion.trim() || !editAnswer.trim()) {
      toast.error(t('adminQuestions.questionAnswerRequired'));
      return;
    }
    setEditSaving(true);
    try {
      await questionsApi.update(editingId, {
        questionText: editQuestion.trim(),
        answerText: editAnswer.trim(),
        subjectId: editSubjectId,
      });
      toast.success(t('adminQuestions.questionUpdated'));
      cancelEdit();
      load(page);
      loadCounts();
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('adminQuestions.failedUpdate'));
    } finally {
      setEditSaving(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!subjectId) {
      toast.error(t('adminQuestions.selectSubjectFirst'));
      return;
    }

    setGeneratingQuiz(true);
    try {
      const { data } = await questionsApi.generateQuiz(
        subjectId,
        quizTitle.trim() || undefined,
      );
      toast.success(data.message || t('adminQuestions.quizGenerated'));
      setQuizTitle('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || t('adminQuestions.failedGenerateQuiz'));
    } finally {
      setGeneratingQuiz(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('adminQuestions.title')}</h1>
        <p className="text-gray-500">{t('adminQuestions.subtitle')}</p>
      </div>

      {/* Stats */}
      {counts && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100">
                <HelpCircle size={18} className="text-gray-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{counts.total}</p>
                <p className="text-xs text-gray-500">{t('adminQuestions.total')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100">
                <HelpCircle size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-amber-600">{counts.pending}</p>
                <p className="text-xs text-gray-500">{t('common.pending')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100">
                <Check size={18} className="text-green-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-green-600">{counts.approved}</p>
                <p className="text-xs text-gray-500">{t('common.approved')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100">
                <X size={18} className="text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-red-600">{counts.rejected}</p>
                <p className="text-xs text-gray-500">{t('common.rejected')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Quiz Generation */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-900">
            <Sparkles size={20} className="text-blue-600" />
            {t('adminQuestions.generateAIQuiz')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800 mb-4">
            {t('adminQuestions.generateAIQuizDesc')}
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-blue-700 mb-1">{t('adminQuestions.subject')}</label>
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="bg-white"
              >
                <option value="">{t('adminQuestions.selectSubject')}</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-blue-700 mb-1">{t('adminQuestions.quizTitleOptional')}</label>
              <Input
                placeholder={t('adminQuestions.autoGenerated')}
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                className="bg-white"
              />
            </div>
            <Button
              onClick={handleGenerateQuiz}
              disabled={!subjectId || generatingQuiz}
              className="shrink-0"
            >
              {generatingQuiz ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {t('adminQuestions.generating')}
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  {t('adminQuestions.generateQuiz')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder={t('adminQuestions.searchPlaceholder')}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </form>
        <Select
          value={status}
          onChange={(e) => { setStatus(e.target.value); }}
          className="w-44"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <span className="text-sm text-gray-500">{t('adminQuestions.questionsCount', { count: total })}</span>
      </div>

      {/* Questions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<HelpCircle size={48} />}
          title={t('adminQuestions.noQuestionsFound')}
          description={status ? t('adminQuestions.noStatusQuestions', { status: status.toLowerCase() }) : t('adminQuestions.noQuestionsSubmitted')}
        />
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <Card key={q.id} className="transition-shadow hover:shadow-md animate-item-in" style={{ animationDelay: `${i * 40}ms` }}>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                    {q.imagePath ? (
                      <Image size={20} className="text-blue-600" />
                    ) : (
                      <HelpCircle size={20} className="text-blue-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {statusBadge(q.status)}
                      <Badge variant="outline">{q.subject?.name || t('adminQuestions.unknown')}</Badge>
                      <span className="text-xs text-gray-400">
                        {t('adminQuestions.submittedBy')} {q.createdBy?.firstName} {q.createdBy?.lastName}
                        ({q.createdBy?.role}) • {new Date(q.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Editing mode */}
                    {editingId === q.id ? (
                      <div className="mt-2 space-y-3" onClick={(e) => e.stopPropagation()}>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminQuestions.subject')}</label>
                          <Select value={editSubjectId} onChange={(e) => setEditSubjectId(e.target.value)}>
                            {subjects.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </Select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminQuestions.question')}</label>
                          <Textarea value={editQuestion} onChange={(e) => setEditQuestion(e.target.value)} rows={2} />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('adminQuestions.answer')}</label>
                          <Textarea value={editAnswer} onChange={(e) => setEditAnswer(e.target.value)} rows={3} />
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={handleSaveEdit} disabled={editSaving}>
                            <Save size={14} className="mr-1" /> {editSaving ? t('adminQuestions.saving') : t('common.save')}
                          </Button>
                          <Button size="sm" variant="outline" onClick={cancelEdit}>
                            <X size={14} className="mr-1" /> {t('common.cancel')}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p
                          className="font-medium text-gray-900 cursor-pointer"
                          onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}
                        >
                          {q.questionText}
                        </p>

                        {/* Expanded view */}
                        {expandedId === q.id && (
                          <div className="mt-3 space-y-3">
                            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
                              <p className="text-xs font-semibold text-green-700 uppercase tracking-wider mb-1">{t('adminQuestions.answer')}</p>
                              <p className="text-gray-800 whitespace-pre-wrap">{q.answerText}</p>
                            </div>
                            {q.imagePath && (
                              <div>
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{t('adminQuestions.image')}</p>
                                <img
                                  src={`${API_BASE}/uploads/question-images/${q.imagePath.split('/').pop()}`}
                                  alt={t('adminQuestions.question')}
                                  className="max-w-full max-h-64 rounded-lg border"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {editingId !== q.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500 hover:bg-blue-50 hover:text-blue-600"
                        onClick={() => startEdit(q)}
                        title={t('common.edit')}
                      >
                        <Pencil size={15} />
                      </Button>
                    )}
                    {q.status === 'PENDING' && editingId !== q.id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleReview(q.id, 'APPROVED')}
                          title={t('adminQuestions.approve')}
                        >
                          <Check size={16} />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleReview(q.id, 'REJECTED')}
                          title={t('adminQuestions.reject')}
                        >
                          <X size={16} />
                        </Button>
                      </>
                    )}
                    {q.status === 'REJECTED' && editingId !== q.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:bg-green-50 hover:text-green-700"
                        onClick={() => handleReview(q.id, 'APPROVED')}
                      title={t('adminQuestions.approve')}
                    >
                      <Check size={16} />
                    </Button>
                    )}
                    {q.status === 'APPROVED' && editingId !== q.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => handleReview(q.id, 'REJECTED')}
                        title={t('adminQuestions.reject')}
                      >
                        <X size={16} />
                      </Button>
                    )}
                    {editingId !== q.id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => handleDelete(q.id)}
                        title={t('common.delete')}
                      >
                        <Trash2 size={16} />
                      </Button>
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
            {t('adminQuestions.pageOf', { page, totalPages })}
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
