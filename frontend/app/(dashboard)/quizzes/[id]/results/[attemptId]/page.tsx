'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { quizzesApi } from '@/lib/api';
import type { QuizAttempt } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { CheckCircle2, XCircle, Minus, ArrowLeft, Trophy } from 'lucide-react';

export default function QuizResultsPage() {
  const { id: quizId, attemptId } = useParams<{ id: string; attemptId: string }>();
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    quizzesApi
      .getResults(attemptId)
      .then((res) => setAttempt(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [attemptId]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <EmptyState
        title="Results not found"
        action={
          <Link href="/quiz-history">
            <Button variant="outline">Quiz History</Button>
          </Link>
        }
      />
    );
  }

  const score = attempt.score ?? 0;
  const answers = attempt.answers || [];
  const correct = answers.filter((a) => a.isCorrect === true).length;
  const incorrect = answers.filter((a) => a.isCorrect === false).length;
  const pending = answers.filter((a) => a.isCorrect === null).length;

  const scoreColor =
    score >= 80 ? 'text-green-600' : score >= 50 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/quiz-history"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Back to History
      </Link>

      {/* Score card */}
      <Card className="text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Trophy size={32} className="text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
          <CardDescription>{attempt.quiz?.title}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`text-5xl font-bold ${scoreColor}`}>
            {Math.round(score)}%
          </div>
          <div className="mt-4 flex items-center justify-center gap-6 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 size={16} /> {correct} correct
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <XCircle size={16} /> {incorrect} incorrect
            </span>
            {pending > 0 && (
              <span className="flex items-center gap-1 text-gray-400">
                <Minus size={16} /> {pending} pending
              </span>
            )}
          </div>
          <div className="mt-4 flex justify-center gap-3">
            <Link href={`/quizzes/${quizId}`}>
              <Button variant="outline">Retake Quiz</Button>
            </Link>
            <Link href="/quiz-history">
              <Button variant="secondary">View History</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Question breakdown */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Question Breakdown</h2>
        {answers.map((ans, idx) => {
          const q = ans.question;
          if (!q) return null;

          return (
            <Card
              key={ans.id}
              className={
                ans.isCorrect === true
                  ? 'border-green-200 bg-green-50/50'
                  : ans.isCorrect === false
                  ? 'border-red-200 bg-red-50/50'
                  : 'border-gray-200'
              }
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold shrink-0 border">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{q.questionText}</p>
                    <div className="mt-2 space-y-1.5">
                      {q.options.map((opt) => {
                        const isUserAnswer = ans.selectedOptionId === opt.id;
                        const isCorrectOption = opt.isCorrect;
                        return (
                          <div
                            key={opt.id}
                            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                              isCorrectOption
                                ? 'bg-green-100 text-green-800 font-medium'
                                : isUserAnswer
                                ? 'bg-red-100 text-red-800'
                                : 'text-gray-600'
                            }`}
                          >
                            {isCorrectOption ? (
                              <CheckCircle2 size={14} className="text-green-600 shrink-0" />
                            ) : isUserAnswer ? (
                              <XCircle size={14} className="text-red-500 shrink-0" />
                            ) : (
                              <span className="w-3.5 shrink-0" />
                            )}
                            {opt.optionText}
                            {isUserAnswer && !isCorrectOption && (
                              <Badge variant="destructive" className="ml-auto text-xs">
                                Your answer
                              </Badge>
                            )}
                            {isCorrectOption && (
                              <Badge variant="success" className="ml-auto text-xs">
                                Correct
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      {ans.textAnswer && (
                        <div className="rounded-md bg-gray-100 px-3 py-1.5 text-sm text-gray-700">
                          Your answer: {ans.textAnswer}
                        </div>
                      )}
                    </div>
                    {q.explanation && (
                      <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0">
                    {ans.isCorrect === true ? (
                      <CheckCircle2 size={20} className="text-green-500" />
                    ) : ans.isCorrect === false ? (
                      <XCircle size={20} className="text-red-500" />
                    ) : (
                      <Minus size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
