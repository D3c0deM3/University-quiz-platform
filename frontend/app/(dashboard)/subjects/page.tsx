'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { subjectsApi, subscriptionsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { useAuthStore } from '@/stores/auth-store';
import type { Subject } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { BookOpen, Search, ArrowRight, Lock, MessageCircle, Phone, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function SubjectsPage() {
 const { t } = useTranslation();
 const { user } = useAuthStore();
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [filtered, setFiltered] = useState<Subject[]>([]);
 const [search, setSearch] = useState('');
 const [loading, setLoading] = useState(true);
 const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
 const [modalSubject, setModalSubject] = useState<Subject | null>(null);

 useEffect(() => {
 async function load() {
 try {
 const res = await subjectsApi.list(1, 100);
 const data = res.data.data || res.data || [];
 setSubjects(data);
 setFiltered(data);

 if (user?.role === 'STUDENT') {
 try {
 const subRes = await subscriptionsApi.my();
 const ids: string[] = subRes.data.subjectIds || [];
 setSubscribedIds(new Set(ids));
 } catch {
 // no subscriptions
 }
 } else {
 setSubscribedIds(new Set(data.map((s: Subject) => s.id)));
 }
 } finally {
 setLoading(false);
 }
 }
 load();
 }, [user]);

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

 const isStudent = user?.role === 'STUDENT';

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">{t('subjects.title')}</h1>
 <p className="text-gray-500 dark:text-slate-400">{t('subjects.subtitle')}</p>
 </div>
 </div>

 {/* Search */}
 <div className="relative max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" size={18} />
 <Input
 placeholder={t('subjects.searchPlaceholder')}
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
 title={t('subjects.noSubjects')}
 description={search ? t('subjects.noSubjectsSearch') : t('subjects.noDescription')}
 />
 ) : (
 <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {filtered.map((subject) => {
 const hasAccess = subscribedIds.has(subject.id);
 const isLocked = isStudent && !hasAccess;

 return isLocked ? (
 <div key={subject.id}>
 <Card className="h-full relative overflow-hidden border-gray-200 dark:border-slate-700 opacity-80">
 <CardContent className="flex flex-col gap-3 p-6">
 <div className="flex items-start justify-between">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-700">
 <Lock size={20} className="text-gray-400 dark:text-slate-500" />
 </div>
 <div className="flex items-center gap-1.5">
 {subject.code && (
 <Badge variant="outline">{subject.code}</Badge>
 )}
 <Badge variant="secondary" className="text-xs">Locked</Badge>
 </div>
 </div>
 <div>
 <h3 className="font-semibold text-gray-900 dark:text-slate-100">{subject.name}</h3>
 {subject.description && (
 <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
 {subject.description}
 </p>
 )}
 </div>
 <div className="mt-auto pt-1">
 <Button
 size="sm"
 variant="outline"
 className="w-full border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer"
 onClick={() => setModalSubject(subject)}
 >
 <Sparkles size={14} className="mr-1.5" /> Subscribe
 </Button>
 </div>
 </CardContent>
 </Card>
 </div>
 ) : (
 <Link key={subject.id} href={`/subjects/${subject.id}`}>
 <Card className="h-full transition-shadow hover:shadow-md cursor-pointer">
 <CardContent className="flex flex-col gap-3 p-6">
 <div className="flex items-start justify-between">
 <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/40">
 <BookOpen size={20} className="text-blue-600 dark:text-blue-400" />
 </div>
 <div className="flex items-center gap-1.5">
 {subject.code && (
 <Badge variant="outline">{subject.code}</Badge>
 )}
 {isStudent && <Badge variant="success" className="text-xs">Subscribed</Badge>}
 </div>
 </div>
 <div>
 <h3 className="font-semibold text-gray-900 dark:text-slate-100">{subject.name}</h3>
 {subject.description && (
 <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 line-clamp-2">
 {subject.description}
 </p>
 )}
 </div>
 <div className="mt-auto flex items-center text-sm text-blue-600 dark:text-blue-400 font-medium">
 {t('subjects.viewSubject')} <ArrowRight size={14} className="ml-1" />
 </div>
 </CardContent>
 </Card>
 </Link>
 );
 })}
 </div>
 )}

 {/* Subscribe Modal */}
 {modalSubject && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
 {/* Backdrop */}
 <div
 className="absolute inset-0 bg-black/50 backdrop-blur-sm"
 onClick={() => setModalSubject(null)}
 />
 {/* Modal */}
 <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
 {/* Close button */}
 <button
 onClick={() => setModalSubject(null)}
 className="absolute right-4 top-4 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
 >
 <X size={20} />
 </button>

 {/* Header */}
 <div className="px-6 pt-6 pb-4 text-center border-b border-gray-100 dark:border-slate-700">
 <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
 <BookOpen size={26} className="text-blue-600 dark:text-blue-400" />
 </div>
 <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
 Subscribe to {modalSubject.name}
 </h2>
 <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
 Unlock full access to this subject&apos;s learning resources
 </p>
 </div>

 {/* Pricing */}
 <div className="px-6 py-5">
 <div className="rounded-xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 p-4 text-center mb-5">
 <p className="text-3xl font-bold text-gray-900 dark:text-slate-100">$1</p>
 <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">10,000 UZS &middot; one-time per subject</p>
 </div>

 {/* What's included */}
 <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">What&apos;s included</p>
 <ul className="space-y-2.5 mb-5">
 <li className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
 <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
 All quizzes &amp; practice tests for this subject
 </li>
 <li className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
 <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
 Complete Q&amp;A question bank
 </li>
 <li className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
 <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
 Study materials &amp; documents
 </li>
 <li className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-slate-300">
 <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
 Continuous content updates at no extra cost
 </li>
 </ul>

 {/* Contact */}
 <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-3">Get in touch</p>
 <div className="space-y-2">
 <a
 href="tel:+998915817711"
 className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
 >
 <Phone size={18} className="text-gray-500 dark:text-slate-400" />
 <span>+998 91 581 77 11</span>
 </a>
 <a
 href="https://t.me/D3c0de_M3"
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
 >
 <MessageCircle size={18} className="text-blue-500" />
 <span>@D3c0de_M3</span>
 <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">Telegram</span>
 </a>
 <a
 href="https://t.me/cdimock_test"
 target="_blank"
 rel="noopener noreferrer"
 className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
 >
 <MessageCircle size={18} className="text-blue-500" />
 <span>@cdimock_test</span>
 <span className="ml-auto text-xs text-gray-400 dark:text-slate-500">Telegram</span>
 </a>
 </div>
 </div>

 {/* Footer */}
 <div className="px-6 pb-6">
 <Button
 variant="outline"
 className="w-full cursor-pointer"
 onClick={() => setModalSubject(null)}
 >
 Close
 </Button>
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
