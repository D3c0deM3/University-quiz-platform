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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('quizHistory.title')}</h1>
        <p className="text-gray-500">{t('quizHistory.subtitle')}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                <ClipboardList size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAttempts}</p>
                <p className="text-sm text-gray-500">{t('quizHistory.totalAttempts')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <TrendingUp size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(stats.averageScore)}%
                </p>
                <p className="text-sm text-gray-500">{t('quizHistory.averageScore')}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                <Trophy size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.subjectStats.length}
                </p>
                <p className="text-sm text-gray-500">{t('quizHistory.subjectsTested')}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Subject breakdown */}
      {stats && stats.subjectStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('quizHistory.performanceBySubject')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.subjectStats.map((ss) => (
                <div key={ss.subjectId} className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{ss.subjectName}</p>
                    <div className="mt-1 h-2 rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${Math.min(ss.averageScore, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-gray-900">{Math.round(ss.averageScore)}%</p>
                    <p className="text-xs text-gray-400">{ss.totalAttempts} {t('quizHistory.attempts')}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attempts list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={18} />
            {t('quizHistory.recentAttempts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : attempts.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={40} />}
              title={t('quizHistory.noAttemptsYet')}
              description={t('quizHistory.noAttemptsDesc')}
              action={
                <Link href="/subjects">
                  <Button>{t('quizHistory.browseSubjects')}</Button>
                </Link>
              }
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
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
                    className="flex items-center gap-4 rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${scoreColor} shrink-0`}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">
                        {att.quiz?.title || att.quizTitle || t('quizHistory.quiz')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {att.subjectName || att.quiz?.subject?.name
                          ? <span className="text-blue-600">{att.subjectName || att.quiz?.subject?.name}</span>
                          : null}
                        {(att.subjectName || att.quiz?.subject?.name) ? ' • ' : ''}
                        {formatDate(att.startedAt)}
                        {att.completedAt ? ` • ${t('quizHistory.completed')}` : ` • ${t('quizHistory.inProgress')}`}
                        {att.totalQuestions ? ` • ${att.totalQuestions} ${t('quizHistory.questions')}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant={
                          scoreVal >= 80
                            ? 'success'
                            : scoreVal >= 50
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {formatScore(att.score)}
                      </Badge>
                      <ArrowRight size={16} className="text-gray-400" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => loadData(page - 1)}
              >
                {t('common.previous')}
              </Button>
              <span className="text-sm text-gray-500">
                {t('quizHistory.pageOf', { page: String(page), totalPages: String(totalPages) })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => loadData(page + 1)}
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
