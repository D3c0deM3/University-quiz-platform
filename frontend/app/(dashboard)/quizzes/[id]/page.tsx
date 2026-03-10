'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { quizzesApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import type { Quiz, QuizAttempt, QuizQuestion } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { toast } from 'sonner';
import {
  ClipboardList,
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Send,
} from 'lucide-react';

type AnswerMap = Record<string, { selectedOptionId?: string; textAnswer?: string }>;

export default function QuizTakePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Load quiz details
  useEffect(() => {
    if (!id) return;
    quizzesApi
      .get(id)
      .then((res) => setQuiz(res.data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [id]);

  const startQuiz = useCallback(async () => {
    if (!id) return;
    setStarting(true);
    try {
      const { data } = await quizzesApi.startAttempt(id);
      setAttempt(data);
      // Initialize answers map
      const questions: QuizQuestion[] = data.quiz?.questions || [];
      const initial: AnswerMap = {};
      questions.forEach((q) => {
        initial[q.id] = {};
      });
      setAnswers(initial);
      setQuiz(data.quiz || quiz);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setStarting(false);
    }
  }, [id, quiz]);

  const setAnswer = (questionId: string, value: { selectedOptionId?: string; textAnswer?: string }) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], ...value },
    }));
  };

  const submitQuiz = async () => {
    if (!attempt) return;
    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([questionId, ans]) => ({
        questionId,
        selectedOptionId: ans.selectedOptionId || undefined,
        textAnswer: ans.textAnswer || undefined,
      }));
      await quizzesApi.submitAttempt(attempt.id, answerArray);
      toast.success(t('common.success'));
      router.push(`/quizzes/${id}/results/${attempt.id}`);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <EmptyState
        icon={<ClipboardList size={48} />}
        title={t('quiz.notFound')}
        action={
          <Link href="/subjects">
            <Button variant="outline">{t('quizHistory.browseSubjects')}</Button>
          </Link>
        }
      />
    );
  }

  const questions = quiz.questions || [];

  // ── Not started ──
  if (!attempt) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6">
        <Link
          href={`/subjects/${quiz.subjectId}`}
          className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={12} /> {t('quiz.backToSubject')}
        </Link>

        <Card>
          <CardHeader className="text-center p-4 sm:p-6">
            <div className="mx-auto mb-2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-blue-100">
              <ClipboardList size={24} className="text-blue-600" />
            </div>
            <CardTitle className="text-lg sm:text-2xl">{quiz.title}</CardTitle>
            {quiz.description && <CardDescription className="text-xs sm:text-sm">{quiz.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4 text-center px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <ClipboardList size={13} />
                {questions.length} {t('quiz.questions').toLowerCase()}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={13} />
                {t('quiz.minutes')}
              </span>
            </div>
            <Button size="lg" onClick={startQuiz} loading={starting} className="px-6 sm:px-8">
              {t('quiz.startQuiz')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── In progress ──
  const currentQ = questions[currentIndex];
  const answeredCount = Object.values(answers).filter(
    (a) => a.selectedOptionId || a.textAnswer,
  ).length;

  return (
    <div className="max-w-3xl mx-auto flex flex-col min-h-[calc(100dvh-8rem)] sm:min-h-0 sm:block space-y-3 sm:space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-sm sm:text-lg font-bold text-gray-900 truncate">{quiz.title}</h1>
          <p className="text-[11px] sm:text-sm text-gray-500">
            {currentIndex + 1}/{questions.length} • {answeredCount} {t('quiz.answered')}
          </p>
        </div>
        <Badge variant="default" className="shrink-0 text-xs">
          {Math.round((answeredCount / questions.length) * 100)}%
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 sm:h-2 rounded-full bg-gray-200 mt-3 sm:mt-0">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Current question — grows to fill available space on mobile */}
      {currentQ && (
        <Card className="mt-3 sm:mt-0 flex-1 sm:flex-none flex flex-col">
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <span className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full bg-blue-100 text-xs sm:text-sm font-bold text-blue-600 shrink-0">
                {currentIndex + 1}
              </span>
              <div className="min-w-0 flex-1">
                <CardTitle className="text-sm sm:text-lg leading-snug break-words">{currentQ.questionText}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6 flex-1">
            {currentQ.questionType === 'SHORT_ANSWER' ? (
              <Input
                placeholder={t('quiz.selectAnswer')}
                value={answers[currentQ.id]?.textAnswer || ''}
                onChange={(e) => setAnswer(currentQ.id, { textAnswer: e.target.value })}
              />
            ) : (
              currentQ.options.map((opt) => {
                const isSelected = answers[currentQ.id]?.selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setAnswer(currentQ.id, { selectedOptionId: opt.id })}
                    className={`flex w-full items-center gap-2.5 sm:gap-3 rounded-lg border p-2.5 sm:p-4 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                    ) : (
                      <Circle size={18} className="text-gray-300 shrink-0" />
                    )}
                    <span className={`text-xs sm:text-sm break-words min-w-0 leading-snug ${isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}>
                      {opt.optionText}
                    </span>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Bottom section — pushed to bottom on mobile */}
      <div className="mt-auto sm:mt-0 space-y-3 sm:space-y-6 pt-2 sm:pt-0">
        {/* Question dots — scrollable on mobile */}
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 sm:gap-2 justify-center min-w-max">
          {questions.map((_, i) => {
            const q = questions[i];
            const answered = answers[q.id]?.selectedOptionId || answers[q.id]?.textAnswer;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full text-[10px] sm:text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                  i === currentIndex
                    ? 'bg-blue-600 text-white'
                    : answered
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="shrink-0 text-xs sm:text-sm h-8 sm:h-9"
        >
          {t('common.previous')}
        </Button>
        <span className="text-[10px] text-gray-400 sm:hidden">
          {currentIndex + 1}/{questions.length}
        </span>
        {currentIndex < questions.length - 1 ? (
          <Button size="sm" onClick={() => setCurrentIndex((i) => i + 1)} className="shrink-0 text-xs sm:text-sm h-8 sm:h-9">{t('common.next')}</Button>
        ) : (
          <Button size="sm" onClick={submitQuiz} loading={submitting} className="gap-1.5 shrink-0 text-xs sm:text-sm h-8 sm:h-9">
            <Send size={14} /> {t('quiz.submit')}
          </Button>
        )}
      </div>
      </div>
    </div>
  );
}
