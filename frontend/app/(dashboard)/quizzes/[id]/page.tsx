'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { quizzesApi } from '@/lib/api';
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
      .catch(() => toast.error('Failed to load quiz'))
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
      toast.error('Failed to start quiz');
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
      toast.success('Quiz submitted!');
      router.push(`/quizzes/${id}/results/${attempt.id}`);
    } catch {
      toast.error('Failed to submit quiz');
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
        title="Quiz not found"
        action={
          <Link href="/subjects">
            <Button variant="outline">Browse Subjects</Button>
          </Link>
        }
      />
    );
  }

  const questions = quiz.questions || [];

  // ── Not started ──
  if (!attempt) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/subjects/${quiz.subjectId}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={14} /> Back to Subject
        </Link>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <ClipboardList size={28} className="text-blue-600" />
            </div>
            <CardTitle className="text-2xl">{quiz.title}</CardTitle>
            {quiz.description && <CardDescription>{quiz.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <ClipboardList size={14} />
                {questions.length} questions
              </span>
              <span className="flex items-center gap-1">
                <Clock size={14} />
                No time limit
              </span>
            </div>
            <Button size="lg" onClick={startQuiz} loading={starting} className="px-8">
              Start Quiz
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
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Progress header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{quiz.title}</h1>
          <p className="text-sm text-gray-500">
            Question {currentIndex + 1} of {questions.length} • {answeredCount} answered
          </p>
        </div>
        <Badge variant="default">
          {Math.round((answeredCount / questions.length) * 100)}%
        </Badge>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Current question */}
      {currentQ && (
        <Card>
          <CardHeader>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600 shrink-0">
                {currentIndex + 1}
              </span>
              <div>
                <CardTitle className="text-lg">{currentQ.questionText}</CardTitle>
                <Badge variant="secondary" className="mt-2">
                  {currentQ.questionType === 'MCQ'
                    ? 'Multiple Choice'
                    : currentQ.questionType === 'TRUE_FALSE'
                    ? 'True/False'
                    : 'Short Answer'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {currentQ.questionType === 'SHORT_ANSWER' ? (
              <Input
                placeholder="Type your answer…"
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
                    className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {isSelected ? (
                      <CheckCircle2 size={20} className="text-blue-600 shrink-0" />
                    ) : (
                      <Circle size={20} className="text-gray-300 shrink-0" />
                    )}
                    <span className={isSelected ? 'text-blue-900 font-medium' : 'text-gray-700'}>
                      {opt.optionText}
                    </span>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
        >
          Previous
        </Button>
        <div className="flex gap-2">
          {questions.map((_, i) => {
            const q = questions[i];
            const answered = answers[q.id]?.selectedOptionId || answers[q.id]?.textAnswer;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(i)}
                className={`h-8 w-8 rounded-full text-xs font-medium transition-colors cursor-pointer ${
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
        {currentIndex < questions.length - 1 ? (
          <Button onClick={() => setCurrentIndex((i) => i + 1)}>Next</Button>
        ) : (
          <Button onClick={submitQuiz} loading={submitting} className="gap-2">
            <Send size={16} /> Submit Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
