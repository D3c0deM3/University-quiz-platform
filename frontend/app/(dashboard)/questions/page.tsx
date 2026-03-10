'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { questionsApi, subscriptionsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
 HelpCircle,
 Plus,
 BookOpen,
 MessageSquare,
 ArrowRight,
 Lock,
} from 'lucide-react';

interface SubjectCount {
 subjectId: string;
 subjectName: string;
 subjectDescription: string | null;
 questionCount: number;
}

// Color palette for subject cards
const CARD_COLORS = [
 { bg: 'bg-blue-50 dark:bg-blue-500/8', icon: 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400', accent: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20 hover:border-blue-300 dark:hover:border-blue-500/40' },
 { bg: 'bg-purple-50 dark:bg-purple-500/8', icon: 'bg-purple-100 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400', accent: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-500/20 hover:border-purple-300 dark:hover:border-purple-500/40' },
 { bg: 'bg-emerald-50 dark:bg-emerald-500/8', icon: 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', accent: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20 hover:border-emerald-300 dark:hover:border-emerald-500/40' },
 { bg: 'bg-orange-50 dark:bg-orange-500/8', icon: 'bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400', accent: 'text-orange-600 dark:text-orange-400', border: 'border-orange-100 dark:border-orange-500/20 hover:border-orange-300 dark:hover:border-orange-500/40' },
 { bg: 'bg-pink-50 dark:bg-pink-500/8', icon: 'bg-pink-100 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400', accent: 'text-pink-600 dark:text-pink-400', border: 'border-pink-100 dark:border-pink-500/20 hover:border-pink-300 dark:hover:border-pink-500/40' },
 { bg: 'bg-cyan-50 dark:bg-cyan-500/8', icon: 'bg-cyan-100 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400', accent: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-100 dark:border-cyan-500/20 hover:border-cyan-300 dark:hover:border-cyan-500/40' },
 { bg: 'bg-amber-50 dark:bg-amber-500/8', icon: 'bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400', accent: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20 hover:border-amber-300 dark:hover:border-amber-500/40' },
 { bg: 'bg-indigo-50 dark:bg-indigo-500/8', icon: 'bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', accent: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-500/20 hover:border-indigo-300 dark:hover:border-indigo-500/40' },
];

export default function QuestionsPage() {
 const { user } = useAuthStore();
 const { t } = useTranslation();
 const [subjectCounts, setSubjectCounts] = useState<SubjectCount[]>([]);
 const [loading, setLoading] = useState(true);
 const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());

 useEffect(() => {
 async function load() {
 try {
 const res = await questionsApi.subjectCounts();
 setSubjectCounts(res.data || []);

 if (user?.role === 'STUDENT') {
 try {
 const subRes = await subscriptionsApi.my();
 setSubscribedIds(new Set(subRes.data.subjectIds || []));
 } catch {
 // no subs
 }
 } else {
 // admin/teacher see all
 const ids = (res.data || []).map((sc: SubjectCount) => sc.subjectId);
 setSubscribedIds(new Set(ids));
 }
 } catch {
 // ignore
 } finally {
 setLoading(false);
 }
 }
 load();
 }, [user]);

 const totalQuestions = subjectCounts.reduce((sum, sc) => sum + sc.questionCount, 0);

 return (
 <div className="space-y-5 sm:space-y-8">
 {/* Header */}
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 flex-1">
 <h1 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('questions.title')}</h1>
 <p className="text-xs sm:text-base text-gray-500 dark:text-zinc-400 mt-1">
 {t('questions.subtitle')}
 </p>
 </div>
 <Link href="/questions/create" className="shrink-0">
 <Button size="sm" className="sm:size-default">
 <Plus size={14} className="mr-1 sm:mr-2" />
 <span className="hidden sm:inline">{t('questions.addQuestion')}</span>
 <span className="sm:hidden">{t('questions.addQuestion').split(' ')[0]}</span>
 </Button>
 </Link>
 </div>

 {/* Stats summary */}
 {!loading && subjectCounts.length > 0 && (
 <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm">
 <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-zinc-400">
 <BookOpen size={14} className="text-blue-500" />
 <span className="font-medium">{subjectCounts.length}</span> {t('questions.subjects')}
 </div>
 <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600 dark:text-zinc-400">
 <MessageSquare size={14} className="text-green-500" />
 <span className="font-medium">{totalQuestions}</span> {t('questions.approvedQuestions')}
 </div>
 </div>
 )}

 {/* Subject Cards Grid */}
 {loading ? (
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {[1, 2, 3, 4, 5, 6].map((i) => (
 <Skeleton key={i} className="h-44 w-full rounded-2xl" />
 ))}
 </div>
 ) : subjectCounts.length === 0 ? (
 <EmptyState
 icon={<HelpCircle size={48} />}
 title={t('questions.noQuestionsYet')}
 description={t('questions.beFirstToContribute')}
 action={
 <Link href="/questions/create">
 <Button>{t('questions.addQuestion')}</Button>
 </Link>
 }
 />
 ) : (
 <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
 {subjectCounts.map((sc, idx) => {
 const colors = CARD_COLORS[idx % CARD_COLORS.length];
 const hasAccess = subscribedIds.has(sc.subjectId);
 const isLocked = user?.role === 'STUDENT' && !hasAccess;

 if (isLocked) {
 return (
 <div key={sc.subjectId}>
 <Card className="relative overflow-hidden border-2 border-gray-200 dark:border-zinc-700 opacity-70 h-full">
 <CardContent className="p-4 sm:p-6 flex flex-col h-full">
 <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-zinc-700 text-gray-400 dark:text-zinc-500 mb-3 sm:mb-4">
 <Lock size={18} />
 </div>
 <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1">{sc.subjectName}</h3>
 {sc.subjectDescription && (
 <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 line-clamp-2 mb-3 sm:mb-4 flex-1">{sc.subjectDescription}</p>
 )}
 {!sc.subjectDescription && <div className="flex-1" />}
 <div className="flex items-center justify-between mt-auto pt-2 sm:pt-3 border-t border-gray-100 dark:border-zinc-700">
 <span className="text-[10px] sm:text-sm text-gray-400 dark:text-zinc-500 flex items-center gap-1">
 <Lock size={10} /> {t('questions.subscribeToAccess')}
 </span>
 </div>
 </CardContent>
 </Card>
 </div>
 );
 }

 return (
 <Link key={sc.subjectId} href={`/questions/${sc.subjectId}`}>
 <Card
 className={`group relative overflow-hidden border-2 ${colors.border} transition-all hover:shadow-lg cursor-pointer h-full`}
 >
 <CardContent className="p-4 sm:p-6 flex flex-col h-full">
 {/* Icon */}
 <div
 className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${colors.icon} mb-3 sm:mb-4`}
 >
 <BookOpen size={18} />
 </div>

 {/* Subject Name */}
 <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-zinc-100 mb-1 group-hover:text-gray-700 dark:group-hover:text-zinc-300 dark:hover:text-zinc-300 transition-colors">
 {sc.subjectName}
 </h3>

 {/* Description */}
 {sc.subjectDescription && (
 <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 line-clamp-2 mb-3 sm:mb-4 flex-1">
 {sc.subjectDescription}
 </p>
 )}
 {!sc.subjectDescription && <div className="flex-1" />}

 {/* Footer */}
 <div className="flex items-center justify-between mt-auto pt-2 sm:pt-3 border-t border-gray-100 dark:border-zinc-700">
 <div className="flex items-center gap-1.5">
 <MessageSquare size={12} className={colors.accent} />
 <span className={`text-xs sm:text-sm font-semibold ${colors.accent}`}>
 {sc.questionCount}
 </span>
 <span className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
 {t('questions.count')}
 </span>
 </div>
 <ArrowRight
 size={14}
 className="text-gray-400 dark:text-zinc-500 group-hover:text-gray-600 dark:group-hover:text-zinc-300 dark:hover:text-zinc-300 group-hover:translate-x-0.5 transition-all"
 />
 </div>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 )}
 </div>
 );
}
