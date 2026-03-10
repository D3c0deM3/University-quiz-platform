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
  { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', accent: 'text-blue-600', border: 'border-blue-100 hover:border-blue-300' },
  { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', accent: 'text-purple-600', border: 'border-purple-100 hover:border-purple-300' },
  { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', accent: 'text-emerald-600', border: 'border-emerald-100 hover:border-emerald-300' },
  { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', accent: 'text-orange-600', border: 'border-orange-100 hover:border-orange-300' },
  { bg: 'bg-pink-50', icon: 'bg-pink-100 text-pink-600', accent: 'text-pink-600', border: 'border-pink-100 hover:border-pink-300' },
  { bg: 'bg-cyan-50', icon: 'bg-cyan-100 text-cyan-600', accent: 'text-cyan-600', border: 'border-cyan-100 hover:border-cyan-300' },
  { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', accent: 'text-amber-600', border: 'border-amber-100 hover:border-amber-300' },
  { bg: 'bg-indigo-50', icon: 'bg-indigo-100 text-indigo-600', accent: 'text-indigo-600', border: 'border-indigo-100 hover:border-indigo-300' },
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
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{t('questions.title')}</h1>
          <p className="text-xs sm:text-base text-gray-500 mt-1">
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
          <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
            <BookOpen size={14} className="text-blue-500" />
            <span className="font-medium">{subjectCounts.length}</span> {t('questions.subjects')}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-gray-600">
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
                  <Card className="relative overflow-hidden border-2 border-gray-200 opacity-70 h-full">
                    <CardContent className="p-4 sm:p-6 flex flex-col h-full">
                      <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400 mb-3 sm:mb-4">
                        <Lock size={18} />
                      </div>
                      <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1">{sc.subjectName}</h3>
                      {sc.subjectDescription && (
                        <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-3 sm:mb-4 flex-1">{sc.subjectDescription}</p>
                      )}
                      {!sc.subjectDescription && <div className="flex-1" />}
                      <div className="flex items-center justify-between mt-auto pt-2 sm:pt-3 border-t border-gray-100">
                        <span className="text-[10px] sm:text-sm text-gray-400 flex items-center gap-1">
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
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                      {sc.subjectName}
                    </h3>

                    {/* Description */}
                    {sc.subjectDescription && (
                      <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 mb-3 sm:mb-4 flex-1">
                        {sc.subjectDescription}
                      </p>
                    )}
                    {!sc.subjectDescription && <div className="flex-1" />}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-2 sm:pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare size={12} className={colors.accent} />
                        <span className={`text-xs sm:text-sm font-semibold ${colors.accent}`}>
                          {sc.questionCount}
                        </span>
                        <span className="text-xs sm:text-sm text-gray-500">
                          {t('questions.count')}
                        </span>
                      </div>
                      <ArrowRight
                        size={14}
                        className="text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all"
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
