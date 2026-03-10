'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { quizzesApi } from '@/lib/api';
import type { QuizAttempt, QuizStats } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  History,
  Trophy,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { formatDate, formatScore } from '@/lib/utils';

export default function QuizHistoryPage() {
  const { t } = useTranslation();
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [stats, setStats] = useState<QuizStats | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const loadData = async (p = 1) => {
    setLoading(true);
    try {
      const [attRes, statsRes] = await Promise.all([
        quizzesApi.myAttempts(p, 10),
        quizzesApi.myStats(),
      ]);
      setAttempts(attRes.data.data || []);
      setTotal(attRes.data.meta?.total || 0);
      setPage(p);
      setStats(statsRes.data);
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalPages = Math.ceil(total / 10);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{t('quizHistory.title')}</h1>
        <p className="text-xs sm:text-base text-gray-500">{t('quizHistory.subtitle')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-blue-100 mb-1.5 sm:mb-2">
                <ClipboardList size={16} className="text-blue-600" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
              <p className="text-[10px] sm:text-sm text-gray-500 leading-tight">{t('quizHistory.totalAttempts')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-green-100 mb-1.5 sm:mb-2">
                <TrendingUp size={16} className="text-green-600" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {Math.round(stats.averageScore)}%
              </p>
              <p className="text-[10px] sm:text-sm text-gray-500 leading-tight">{t('quizHistory.averageScore')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 sm:p-5">
              <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-purple-100 mb-1.5 sm:mb-2">
                <Trophy size={16} className="text-purple-600" />
              </div>
              <p className="text-lg sm:text-2xl font-bold text-gray-900">
                {stats.subjectStats.length}
              </p>
              <p className="text-[10px] sm:text-sm text-gray-500 leading-tight">{t('quizHistory.subjectsTested')}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subject breakdown */}
      {stats && stats.subjectStats.length > 0 && (
        <Card className="overflow-hidden">
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">{t('quizHistory.performanceBySubject')}</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
            <div className="space-y-2.5 sm:space-y-3">
              {stats.subjectStats.map((ss) => (
                <div key={ss.subjectId} className="flex items-center gap-2.5 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{ss.subjectName}</p>
                    <div className="mt-1 h-1.5 sm:h-2 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${Math.min(ss.averageScore, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-gray-900">{Math.round(ss.averageScore)}%</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">{ss.totalAttempts} {t('quizHistory.attempts')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attempts list */}
      <Card className="overflow-hidden">
        <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
          <CardTitle className="flex items-center gap-1.5 sm:gap-2 text-sm sm:text-lg">
            <History size={15} />
            {t('quizHistory.recentAttempts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-14 sm:h-16 w-full" />
              ))}
            </div>
          ) : attempts.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={36} />}
              title={t('quizHistory.noAttemptsYet')}
              description={t('quizHistory.noAttemptsDesc')}
              action={
                <Link href="/subjects">
                  <Button size="sm">{t('quizHistory.browseSubjects')}</Button>
                </Link>
              }
              className="py-6"
            />
          ) : (
            <div className="space-y-1.5 sm:space-y-2">
              {attempts.map((att) => {
                const scoreVal = att.score ?? 0;
                const scoreColor =
                  scoreVal >= 80
                    ? 'text-green-600 bg-green-100'
                    : scoreVal >= 50
                    ? 'text-yellow-600 bg-yellow-100'
                    : 'text-red-600 bg-red-100';

                return (
                  <Link
                    key={att.id}
                    href={`/quizzes/${att.quizId}/results/${att.id}`}
                    className="flex items-center gap-2.5 sm:gap-4 rounded-lg border border-gray-100 p-2.5 sm:p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full ${scoreColor} shrink-0`}>
                      <CheckCircle2 size={14} className="sm:hidden" />
                      <CheckCircle2 size={18} className="hidden sm:block" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-base font-medium text-gray-900 line-clamp-1">
                        {att.quiz?.title || att.quizTitle || t('quizHistory.quiz')}
                      </p>
                      <p className="text-[10px] sm:text-sm text-gray-500 line-clamp-1">
                        {att.subjectName || att.quiz?.subject?.name
                          ? <span className="text-blue-600">{att.subjectName || att.quiz?.subject?.name}</span>
                          : null}
                        {(att.subjectName || att.quiz?.subject?.name) ? ' · ' : ''}
                        {formatDate(att.startedAt)}
                        {att.totalQuestions ? ` · ${att.totalQuestions}q` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                      <Badge
                        variant={
                          scoreVal >= 80
                            ? 'success'
                            : scoreVal >= 50
                            ? 'warning'
                            : 'destructive'
                        }
                        className="text-[10px] sm:text-xs px-1.5 sm:px-2"
                      >
                        {formatScore(att.score)}
                      </Badge>
                      <ArrowRight size={14} className="text-gray-400 hidden sm:block" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-3 sm:mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => loadData(page - 1)}
                className="text-xs sm:text-sm"
              >
                {t('common.previous')}
              </Button>
              <span className="text-xs sm:text-sm text-gray-500">
                {page}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => loadData(page + 1)}
                className="text-xs sm:text-sm"
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
