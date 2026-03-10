'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { questionsApi, subjectsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n';
import { useDebounce } from '@/lib/useDebounce';
import type { ManualQuestion, Subject } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
 HelpCircle,
 Plus,
 Search,
 ChevronLeft,
 ChevronRight,
 ChevronDown,
 ChevronUp,
 Image,
 User,
 Pencil,
 Trash2,
 X,
 Save,
 ArrowLeft,
 MessageSquare,
} from 'lucide-react';
import { toast } from 'sonner';

const API_BASE =
 process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

export default function SubjectQuestionsPage() {
 const { subjectId } = useParams<{ subjectId: string }>();
 const { user } = useAuthStore();
 const { t } = useTranslation();
 const [subject, setSubject] = useState<Subject | null>(null);
 const [questions, setQuestions] = useState<ManualQuestion[]>([]);
 const [search, setSearch] = useState('');
 const [showMine, setShowMine] = useState(false);
 const [page, setPage] = useState(1);
 const [totalPages, setTotalPages] = useState(1);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(true);
 const [expandedId, setExpandedId] = useState<string | null>(null);

 // Edit state
 const [editingId, setEditingId] = useState<string | null>(null);
 const [editQuestion, setEditQuestion] = useState('');
 const [editAnswer, setEditAnswer] = useState('');
 const [editSaving, setEditSaving] = useState(false);

 const isAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';

 const debouncedSearch = useDebounce(search, 350);

 // Load subject info
 useEffect(() => {
 if (!subjectId) return;
 subjectsApi
 .get(subjectId)
 .then((res) => setSubject(res.data))
 .catch(() => {});
 }, [subjectId]);

 const load = useCallback(
 async (p = 1) => {
 if (!subjectId) return;
 setLoading(true);
 try {
 const params: Record<string, string | number> = {
 page: p,
 limit: 20,
 subjectId,
 status: 'APPROVED',
 };
 if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
 if (showMine) params.mine = 'true';
 const { data } = await questionsApi.list(params);
 setQuestions(data.data || []);
 setTotal(data.meta?.total || 0);
 setTotalPages(data.meta?.totalPages || 1);
 setPage(p);
 } finally {
 setLoading(false);
 }
 },
 [subjectId, debouncedSearch, showMine],
 );

 useEffect(() => {
 load();
 }, [load]);

 const handleSearch = (e: React.FormEvent) => {
 e.preventDefault();
 load(1);
 };

 const canEditOrDelete = (q: ManualQuestion) =>
 isAdmin || q.createdById === user?.id;

 const startEdit = (q: ManualQuestion) => {
 setEditingId(q.id);
 setEditQuestion(q.questionText);
 setEditAnswer(q.answerText);
 setExpandedId(q.id);
 };

 const cancelEdit = () => {
 setEditingId(null);
 setEditQuestion('');
 setEditAnswer('');
 };

 const handleSaveEdit = async () => {
 if (!editingId || !editQuestion.trim() || !editAnswer.trim()) {
 toast.error(t('questions.questionAndAnswerRequired'));
 return;
 }
 setEditSaving(true);
 try {
 await questionsApi.update(editingId, {
 questionText: editQuestion.trim(),
 answerText: editAnswer.trim(),
 subjectId,
 });
 toast.success(t('questions.questionUpdated'));
 cancelEdit();
 load(page);
 } catch (err: any) {
 toast.error(err.response?.data?.message || t('questions.failedToUpdate'));
 } finally {
 setEditSaving(false);
 }
 };

 const handleDelete = async (id: string) => {
 if (!confirm(t('questions.confirmDelete'))) return;
 try {
 await questionsApi.delete(id);
 toast.success(t('questions.questionDeleted'));
 load(page);
 } catch (err: any) {
 toast.error(err.response?.data?.message || t('questions.failedToDelete'));
 }
 };

 return (
 <div className="space-y-4 sm:space-y-6 max-w-4xl mx-auto">
 {/* Back + Header */}
 <Link
 href="/questions"
 className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
 >
 <ArrowLeft size={12} /> {t('questions.backToQABank')}
 </Link>

 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 <h1 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-slate-100 leading-tight">
 {subject?.name || t('subjects.title')} — {t('questions.qa')}
 </h1>
 <p className="text-xs sm:text-base text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
 {subject?.description || t('questions.browseQA')}
 </p>
 </div>
 <Link href="/questions/create" className="shrink-0">
 <Button size="sm" className="sm:size-default">
 <Plus size={14} className="mr-1" />
 <span className="hidden sm:inline">{t('questions.addQuestion')}</span>
 <span className="sm:hidden">Add</span>
 </Button>
 </Link>
 </div>

 {/* Filters */}
 <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 sm:gap-3">
 <form onSubmit={handleSearch} className="relative flex-1 min-w-0">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={16} />
 <Input
 placeholder={t('questions.searchPlaceholder')}
 className="pl-9"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </form>
 <div className="flex items-center gap-2">
 <Button
 variant={showMine ? 'default' : 'outline'}
 size="sm"
 onClick={() => setShowMine(!showMine)}
 >
 <User size={12} className="mr-1" /> {t('questions.myQuestions')}
 </Button>
 <span className="text-xs sm:text-sm text-gray-500 dark:text-slate-400">{total} {t('questions.count')}</span>
 </div>
 </div>

 {/* Questions */}
 {loading ? (
 <div className="space-y-4">
 {[1, 2, 3, 4, 5].map((i) => (
 <Skeleton key={i} className="h-32 w-full rounded-xl" />
 ))}
 </div>
 ) : questions.length === 0 ? (
 <EmptyState
 icon={<HelpCircle size={48} />}
 title={t('questions.noQuestionsYet')}
 description={
 showMine
 ? t('questions.noQuestionsInSubject')
 : t('questions.beFirstQuestion')
 }
 action={
 <Link href="/questions/create">
 <Button>{t('questions.addQuestion')}</Button>
 </Link>
 }
 />
 ) : (
 <div className="space-y-3 sm:space-y-4">
 {questions.map((q, idx) => {
 const isExpanded = expandedId === q.id;
 const isEditing = editingId === q.id;

 return (
 <Card
 key={q.id}
 className="overflow-hidden transition-all hover:shadow-md border-gray-200 dark:border-slate-700 animate-item-in"
 style={{ animationDelay: `${idx * 40}ms` }}
 >
 <CardContent className="p-0">
 {/* Question header row */}
 <div
 className={`flex items-start gap-2.5 sm:gap-4 p-3 sm:p-5 cursor-pointer ${
 isExpanded && !isEditing ? 'border-b border-gray-100 dark:border-slate-700' : ''
 }`}
 onClick={() => {
 if (!isEditing) setExpandedId(isExpanded ? null : q.id);
 }}
 >
 {/* Number badge */}
 <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-blue-600 text-white text-xs sm:text-sm font-bold shrink-0">
 {(page - 1) * 20 + idx + 1}
 </div>

 <div className="flex-1 min-w-0">
 <p className="font-medium sm:font-semibold text-gray-900 dark:text-slate-100 text-[13px] sm:text-[15px] leading-snug break-words">
 {q.questionText}
 </p>
 <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-gray-400 dark:text-slate-500">
 <span className="flex items-center gap-1">
 <User size={10} />
 {q.createdBy?.firstName} {q.createdBy?.lastName}
 </span>
 <span>
 {new Date(q.createdAt).toLocaleDateString()}
 </span>
 {q.imagePath && (
 <span className="flex items-center gap-1 text-blue-500">
 <Image size={10} /> {t('questions.hasImage')}
 </span>
 )}
 </div>
 </div>

 {/* Actions + expand indicator */}
 <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
 {canEditOrDelete(q) && !isEditing && (
 <>
 <Button
 size="sm"
 variant="ghost"
 className="text-gray-400 dark:text-slate-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:text-blue-400 h-7 w-7 sm:h-8 sm:w-8 p-0"
 onClick={(e) => {
 e.stopPropagation();
 startEdit(q);
 }}
 title={t('common.edit')}
 >
 <Pencil size={12} />
 </Button>
 <Button
 size="sm"
 variant="ghost"
 className="text-gray-400 dark:text-slate-500 hover:bg-red-50 dark:bg-red-900/20 hover:text-red-600 dark:text-red-400 h-7 w-7 sm:h-8 sm:w-8 p-0"
 onClick={(e) => {
 e.stopPropagation();
 handleDelete(q.id);
 }}
 title={t('common.delete')}
 >
 <Trash2 size={12} />
 </Button>
 </>
 )}
 {!isEditing &&
 (isExpanded ? (
 <ChevronUp size={16} className="text-gray-400 dark:text-slate-500 ml-0.5" />
 ) : (
 <ChevronDown size={16} className="text-gray-400 dark:text-slate-500 ml-0.5" />
 ))}
 </div>
 </div>

 {/* Expanded: Answer + Image */}
 {isExpanded && !isEditing && (
 <div className="p-3 sm:p-5 pt-2 sm:pt-4 bg-gradient-to-b from-gray-50/80 to-white space-y-3 sm:space-y-4">
 <div className="rounded-lg sm:rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 p-3 sm:p-4">
 <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
 <MessageSquare size={12} className="text-green-600 dark:text-green-400" />
 <p className="text-[10px] sm:text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">
 {t('questions.answer')}
 </p>
 </div>
 <p className="text-xs sm:text-sm text-gray-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
 {q.answerText}
 </p>
 </div>
 {q.imagePath && (
 <div>
 <p className="text-[10px] sm:text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">
 {t('questions.attachedImage')}
 </p>
 <img
 src={`${API_BASE}/uploads/question-images/${q.imagePath.split('/').pop()}`}
 alt="Question"
 className="max-w-full max-h-48 sm:max-h-72 rounded-lg sm:rounded-xl border shadow-sm"
 />
 </div>
 )}
 </div>
 )}

 {/* Edit mode */}
 {isEditing && (
 <div
 className="p-3 sm:p-5 pt-0 space-y-2 sm:space-y-3"
 onClick={(e) => e.stopPropagation()}
 >
 <div>
 <label className="block text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
 {t('questions.question')}
 </label>
 <Textarea
 value={editQuestion}
 onChange={(e) => setEditQuestion(e.target.value)}
 rows={2}
 className="text-sm"
 />
 </div>
 <div>
 <label className="block text-[10px] sm:text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
 {t('questions.answer')}
 </label>
 <Textarea
 value={editAnswer}
 onChange={(e) => setEditAnswer(e.target.value)}
 rows={3}
 className="text-sm"
 />
 </div>
 <div className="flex items-center gap-2">
 <Button size="sm" onClick={handleSaveEdit} disabled={editSaving}>
 <Save size={12} className="mr-1" />{' '}
 {editSaving ? t('questions.saving') : t('common.save')}
 </Button>
 <Button size="sm" variant="outline" onClick={cancelEdit}>
 <X size={12} className="mr-1" /> {t('common.cancel')}
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 );
 })}
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
 className="text-xs sm:text-sm"
 >
 <ChevronLeft size={12} className="mr-0.5" /> {t('common.previous')}
 </Button>
 <span className="text-xs sm:text-sm text-gray-600 dark:text-slate-400">
 {page}/{totalPages}
 </span>
 <Button
 variant="outline"
 size="sm"
 disabled={page >= totalPages}
 onClick={() => load(page + 1)}
 className="text-xs sm:text-sm"
 >
 {t('common.next')} <ChevronRight size={12} className="ml-0.5" />
 </Button>
 </div>
 )}
 </div>
 );
}
