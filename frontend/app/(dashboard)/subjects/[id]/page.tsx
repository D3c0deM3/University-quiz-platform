'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { subjectsApi, materialsApi, quizzesApi, subscriptionsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Subject, Material, Quiz } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { BookOpen, FileText, ClipboardList, ArrowLeft, Lock, Phone, MessageCircle } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function SubjectDetailPage() {
 const { id } = useParams<{ id: string }>();
 const { user } = useAuthStore();
 const { t } = useTranslation();
 const [subject, setSubject] = useState<Subject | null>(null);
 const [materials, setMaterials] = useState<Material[]>([]);
 const [quizzes, setQuizzes] = useState<Quiz[]>([]);
 const [loading, setLoading] = useState(true);
 const [hasAccess, setHasAccess] = useState<boolean | null>(null);

 useEffect(() => {
 if (!id) return;
 async function load() {
 try {
 // Always load subject info
 const subjectRes = await subjectsApi.get(id);
 setSubject(subjectRes.data);

 // Check access for students
 if (user?.role === 'STUDENT') {
 try {
 const checkRes = await subscriptionsApi.check(id);
 setHasAccess(checkRes.data.hasAccess === true);
 } catch {
 setHasAccess(false);
 }
 } else {
 setHasAccess(true);
 }
 } catch {
 // handle error
 } finally {
 setLoading(false);
 }
 }
 load();
 }, [id, user]);

 // Load content only when access confirmed
 useEffect(() => {
 if (!id || hasAccess !== true) return;
 async function loadContent() {
 try {
 const [materialsRes, quizzesRes] = await Promise.all([
 materialsApi.list({ subjectId: id, status: 'PUBLISHED', limit: 50 }),
 quizzesApi.listBySubject(id, 1, 50),
 ]);
 setMaterials(materialsRes.data.data || []);
 setQuizzes(quizzesRes.data.data || []);
 } catch {
 // may fail if no content yet
 }
 }
 loadContent();
 }, [id, hasAccess]);

 if (loading) {
 return (
 <div className="space-y-6">
 <Skeleton className="h-8 w-48" />
 <Skeleton className="h-4 w-96" />
 <div className="grid gap-4 sm:grid-cols-2">
 {[1, 2, 3, 4].map((i) => (
 <Skeleton key={i} className="h-32 w-full rounded-xl" />
 ))}
 </div>
 </div>
 );
 }

 if (!subject) {
 return (
 <EmptyState
 icon={<BookOpen size={48} />}
 title={t('subjectDetail.notFound')}
 action={
 <Link href="/subjects">
 <Button variant="outline">{t('subjectDetail.back')}</Button>
 </Link>
 }
 />
 );
 }

 // Paywall for students without access
 if (hasAccess === false) {
 return (
 <div className="space-y-6">
 <div>
 <Link
 href="/subjects"
 className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 mb-2"
 >
 <ArrowLeft size={12} /> {t('subjectDetail.back')}
 </Link>
 <div className="flex items-center gap-2 sm:gap-3">
 <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-zinc-100">{subject.name}</h1>
 {subject.code && <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">{subject.code}</Badge>}
 </div>
 {subject.description && (
 <p className="mt-1 text-xs sm:text-base text-gray-500 dark:text-zinc-400">{subject.description}</p>
 )}
 </div>

 <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
 <CardContent className="py-8 sm:py-12 text-center space-y-4 sm:space-y-6 px-4 sm:px-6">
 <div className="flex justify-center">
 <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10">
 <Lock size={22} className="text-amber-600 dark:text-amber-400" />
 </div>
 </div>
 <div>
 <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-zinc-100">{t('subjectDetail.subscriptionRequired')}</h2>
 <p className="mt-1.5 sm:mt-2 text-xs sm:text-base text-gray-600 dark:text-zinc-400 max-w-md mx-auto">
 {t('subjectDetail.subscriptionDesc', { name: subject.name })}
 </p>
 </div>

 <div className="rounded-xl bg-white dark:bg-zinc-800 border border-amber-200 p-4 sm:p-6 max-w-sm mx-auto space-y-3 sm:space-y-4">
 <div className="text-center">
 <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-zinc-100">{t('subjectDetail.price')}</p>
 <p className="text-[10px] sm:text-sm text-gray-500 dark:text-zinc-400">{t('subjectDetail.priceDesc')}</p>
 </div>
 <ul className="text-sm text-gray-600 dark:text-zinc-400 space-y-2 text-left">
 <li className="flex items-center gap-2">
 <span className="text-green-500">&#10003;</span> {t('subjectDetail.allQuizzes')}
 </li>
 <li className="flex items-center gap-2">
 <span className="text-green-500">&#10003;</span> {t('subjectDetail.qaBank')}
 </li>
 <li className="flex items-center gap-2">
 <span className="text-green-500">&#10003;</span> {t('subjectDetail.studyMaterials')}
 </li>
 <li className="flex items-center gap-2">
 <span className="text-green-500">&#10003;</span> {t('subjectDetail.continuousContent')}
 </li>
 </ul>
 </div>

 <div className="space-y-3">
 <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">{t('subjectDetail.contactUs')}</p>
 <div className="flex flex-wrap justify-center gap-4">
 <a
 href="tel:+998915817711"
 className="inline-flex items-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-gray-800 transition-colors"
 >
 <Phone size={16} /> +998 91 581 77 11
 </a>
 <a
 href="https://t.me/D3c0de_M3"
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 rounded-lg bg-blue-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-600 transition-colors"
 >
 <MessageCircle size={16} /> @D3c0de_M3
 </a>
 <a
 href="https://t.me/cdimock_test"
 target="_blank"
 rel="noopener noreferrer"
 className="inline-flex items-center gap-2 rounded-lg bg-blue-500 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-600 transition-colors"
 >
 <MessageCircle size={16} /> @cdimock_test
 </a>
 </div>
 </div>
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <div className="space-y-4 sm:space-y-6">
 <div>
 <Link
 href="/subjects"
 className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300 mb-2"
 >
 <ArrowLeft size={12} /> {t('subjectDetail.back')}
 </Link>
 <div className="flex items-center gap-2 sm:gap-3">
 <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-zinc-100">{subject.name}</h1>
 {subject.code && <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">{subject.code}</Badge>}
 </div>
 {subject.description && (
 <p className="mt-1 text-xs sm:text-base text-gray-500 dark:text-zinc-400">{subject.description}</p>
 )}
 </div>

 {/* Materials */}
 <Card className="overflow-hidden">
 <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
 <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
 <FileText size={15} />
 {t('subjectDetail.materials')} ({materials.length})
 </CardTitle>
 </CardHeader>
 <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
 {materials.length === 0 ? (
 <EmptyState
 title={t('subjectDetail.noMaterialsTitle')}
 description={t('subjectDetail.noMaterialsDesc')}
 className="py-6"
 />
 ) : (
 <div className="space-y-1.5 sm:space-y-2">
 {materials.map((m) => (
 <Link
 key={m.id}
 href={`/materials/${m.id}`}
 className="flex items-center gap-2 sm:gap-3 rounded-lg border border-gray-100 dark:border-zinc-700 p-2.5 sm:p-4 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
 >
 <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded bg-gray-100 dark:bg-zinc-700 shrink-0">
 <FileText size={14} className="text-gray-500 dark:text-zinc-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-xs sm:text-base font-medium text-gray-900 dark:text-zinc-100 line-clamp-2 sm:line-clamp-1 leading-snug">
 {m.metadata?.title || m.originalName}
 </p>
 {m.metadata?.summary && (
 <p className="text-[10px] sm:text-sm text-gray-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{m.metadata.summary}</p>
 )}
 </div>
 <Badge variant="secondary" className="shrink-0 text-[10px] sm:text-xs">{m.fileType.toUpperCase()}</Badge>
 </Link>
 ))}
 </div>
 )}
 </CardContent>
 </Card>

 {/* Quizzes */}
 <Card className="overflow-hidden">
 <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
 <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
 <ClipboardList size={15} />
 {t('subjectDetail.quizzes')} ({quizzes.length})
 </CardTitle>
 </CardHeader>
 <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
 {quizzes.length === 0 ? (
 <EmptyState
 title={t('subjectDetail.noQuizzes')}
 description={t('subjectDetail.noQuizzesDesc')}
 className="py-6"
 />
 ) : (
 <div className="space-y-1.5 sm:space-y-2">
 {quizzes.map((q) => (
 <div
 key={q.id}
 className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 dark:border-zinc-700 p-2.5 sm:p-4"
 >
 <div className="flex-1 min-w-0">
 <p className="text-xs sm:text-base font-medium text-gray-900 dark:text-zinc-100 line-clamp-2 leading-snug">{q.title}</p>
 {q.description && (
 <p className="text-[10px] sm:text-sm text-gray-500 dark:text-zinc-400 line-clamp-1 mt-0.5">{q.description}</p>
 )}
 <p className="text-[10px] sm:text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
 {q._count?.questions ?? 0} {t('subjectDetail.questionCount')}
 </p>
 </div>
 <Link href={`/quizzes/${q.id}`} className="shrink-0">
 <Button size="sm" className="text-xs sm:text-sm h-7 sm:h-9 px-2.5 sm:px-4">{t('subjectDetail.takeQuiz')}</Button>
 </Link>
 </div>
 ))}
 </div>
 )}
 </CardContent>
 </Card>
 </div>
 );
}
