'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
 Eye,
 EyeOff,
 XCircle,
} from 'lucide-react';

type AnswerMap = Record<string, { selectedOptionId?: string; textAnswer?: string }>;
type FeedbackMode = 'instant' | 'end';
type RevealedAnswer = { correctOptionId: string | null; isCorrect: boolean };
type RevealedMap = Record<string, RevealedAnswer>;

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
 const [feedbackMode, setFeedbackMode] = useState<FeedbackMode>('end');
 const [revealed, setRevealed] = useState<RevealedMap>({});
 const prevIndexRef = useRef<number>(0);

 // Load quiz details
 useEffect(() => {
 if (!id) return;
 quizzesApi
 .get(id)
 .then((res) => setQuiz(res.data))
 .catch(() => toast.error(t('common.error')))
 .finally(() => setLoading(false));
 }, [id]);

 // Reveal answer when navigating away in instant mode
 useEffect(() => {
 if (feedbackMode !== 'instant' || !quiz) return;
 const questions = quiz.questions || [];
 const prevQ = questions[prevIndexRef.current];
 if (prevQ && prevIndexRef.current !== currentIndex) {
 const ans = answers[prevQ.id];
 if (ans?.selectedOptionId && !revealed[prevQ.id]) {
 quizzesApi
 .checkAnswer(prevQ.id, ans.selectedOptionId)
 .then((res) => {
 setRevealed((prev) => ({
 ...prev,
 [prevQ.id]: {
 correctOptionId: res.data.correctOptionId,
 isCorrect: res.data.isCorrect,
 },
 }));
 })
 .catch(() => {});
 }
 }
 prevIndexRef.current = currentIndex;
 }, [currentIndex, feedbackMode, quiz, answers, revealed]);

 const startQuiz = useCallback(async () => {
 if (!id) return;
 setStarting(true);
 try {
 const { data } = await quizzesApi.startAttempt(id);
 setAttempt(data);
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
 // Don't allow changing answer if already revealed
 if (revealed[questionId]) return;
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
 className="inline-flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300"
 >
 <ArrowLeft size={12} /> {t('quiz.backToSubject')}
 </Link>

 <Card>
 <CardHeader className="text-center p-4 sm:p-6">
 <div className="mx-auto mb-2 flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-500/10">
 <ClipboardList size={24} className="text-blue-600 dark:text-blue-400" />
 </div>
 <CardTitle className="text-lg sm:text-2xl">{quiz.title}</CardTitle>
 {quiz.description && <CardDescription className="text-xs sm:text-sm">{quiz.description}</CardDescription>}
 </CardHeader>
 <CardContent className="space-y-5 text-center px-4 sm:px-6 pb-4 sm:pb-6">
 <div className="flex items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500 dark:text-zinc-400">
 <span className="flex items-center gap-1">
 <ClipboardList size={13} />
 {questions.length} {t('quiz.questions').toLowerCase()}
 </span>
 <span className="flex items-center gap-1">
 <Clock size={13} />
 {t('quiz.minutes')}
 </span>
 </div>

 {/* Feedback mode selector */}
 <div className="mx-auto max-w-sm space-y-2">
 <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-zinc-300">{t('quiz.feedbackModeLabel')}</p>
 <div className="grid grid-cols-1 gap-2">
 <button
 onClick={() => setFeedbackMode('instant')}
 className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
 feedbackMode === 'instant'
 ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/8 ring-1 ring-blue-500'
 : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
 }`}
 >
 <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
 feedbackMode === 'instant' ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-gray-100 dark:bg-zinc-700'
 }`}>
 <Eye size={16} className={feedbackMode === 'instant' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-zinc-500'} />
 </div>
 <div className="min-w-0">
 <p className={`text-xs sm:text-sm font-medium ${feedbackMode === 'instant' ? 'text-blue-900' : 'text-gray-700 dark:text-zinc-300'}`}>
 {t('quiz.instantFeedback')}
 </p>
 <p className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400">{t('quiz.instantFeedbackDesc')}</p>
 </div>
 </button>
 <button
 onClick={() => setFeedbackMode('end')}
 className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors cursor-pointer ${
 feedbackMode === 'end'
 ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/8 ring-1 ring-blue-500'
 : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700'
 }`}
 >
 <div className={`flex h-8 w-8 items-center justify-center rounded-full shrink-0 ${
 feedbackMode === 'end' ? 'bg-blue-100 dark:bg-blue-500/10' : 'bg-gray-100 dark:bg-zinc-700'
 }`}>
 <EyeOff size={16} className={feedbackMode === 'end' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-zinc-500'} />
 </div>
 <div className="min-w-0">
 <p className={`text-xs sm:text-sm font-medium ${feedbackMode === 'end' ? 'text-blue-900' : 'text-gray-700 dark:text-zinc-300'}`}>
 {t('quiz.reviewAtEnd')}
 </p>
 <p className="text-[10px] sm:text-xs text-gray-500 dark:text-zinc-400">{t('quiz.reviewAtEndDesc')}</p>
 </div>
 </button>
 </div>
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
 const isCurrentRevealed = currentQ ? !!revealed[currentQ.id] : false;

 return (
 <div className="max-w-3xl mx-auto flex flex-col min-h-[calc(100dvh-8rem)] sm:min-h-0 sm:block space-y-3 sm:space-y-6">
 {/* Progress header */}
 <div className="flex items-center justify-between gap-2">
 <div className="min-w-0 flex-1">
 <h1 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-zinc-100 truncate">{quiz.title}</h1>
 <p className="text-[11px] sm:text-sm text-gray-500 dark:text-zinc-400">
 {currentIndex + 1}/{questions.length} • {answeredCount} {t('quiz.answered')}
 </p>
 </div>
 <Badge variant="default" className="shrink-0 text-xs">
 {Math.round((answeredCount / questions.length) * 100)}%
 </Badge>
 </div>

 {/* Progress bar */}
 <div className="h-1.5 sm:h-2 rounded-full bg-gray-200 dark:bg-zinc-600 mt-3 sm:mt-0">
 <div
 className="h-full rounded-full bg-blue-600 transition-all"
 style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
 />
 </div>

 {/* Current question — grows to fill available space on mobile */}
 {currentQ && (
 <Card className={`mt-3 sm:mt-0 flex-1 sm:flex-none flex flex-col ${
 isCurrentRevealed
 ? revealed[currentQ.id].isCorrect
 ? 'border-green-200 dark:border-green-500/20 bg-green-50/30 dark:bg-green-500/5'
 : 'border-red-200 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5'
 : ''
 }`}>
 <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-4">
 <div className="flex items-start gap-2 sm:gap-3">
 <span className={`flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs sm:text-sm font-bold shrink-0 ${
 isCurrentRevealed
 ? revealed[currentQ.id].isCorrect
 ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400'
 : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'
 : 'bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
 }`}>
 {currentIndex + 1}
 </span>
 <div className="min-w-0 flex-1">
 <CardTitle className="text-sm sm:text-lg leading-snug break-words">{currentQ.questionText}</CardTitle>
 {isCurrentRevealed && (
 <Badge variant={revealed[currentQ.id].isCorrect ? 'success' : 'destructive'} className="mt-1 text-xs">
 {revealed[currentQ.id].isCorrect ? t('quiz.correct') : t('quiz.incorrect')}
 </Badge>
 )}
 </div>
 </div>
 </CardHeader>
 <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pb-3 sm:pb-6 flex-1">
 {currentQ.questionType === 'SHORT_ANSWER' ? (
 <Input
 placeholder={t('quiz.selectAnswer')}
 value={answers[currentQ.id]?.textAnswer || ''}
 onChange={(e) => setAnswer(currentQ.id, { textAnswer: e.target.value })}
 disabled={isCurrentRevealed}
 />
 ) : (
 currentQ.options.map((opt) => {
 const isSelected = answers[currentQ.id]?.selectedOptionId === opt.id;
 const revealData = revealed[currentQ.id];
 const isRevealed = !!revealData;
 const isCorrectOption = isRevealed && revealData.correctOptionId === opt.id;
 const isWrongSelected = isRevealed && isSelected && !revealData.isCorrect;

 let optionClass = '';
 let iconElement: React.ReactNode = null;

 if (isRevealed) {
 if (isCorrectOption) {
 optionClass = 'border-green-500 bg-green-50 dark:bg-green-500/8 ring-1 ring-green-500';
 iconElement = <CheckCircle2 size={18} className="text-green-600 dark:text-green-400 shrink-0" />;
 } else if (isWrongSelected) {
 optionClass = 'border-red-500 bg-red-50 dark:bg-red-500/8 ring-1 ring-red-500';
 iconElement = <XCircle size={18} className="text-red-500 shrink-0" />;
 } else {
 optionClass = 'border-gray-200 dark:border-zinc-700 opacity-60';
 iconElement = <Circle size={18} className="text-gray-300 shrink-0" />;
 }
 } else {
 optionClass = isSelected
 ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/8'
 : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:border-zinc-600 hover:bg-gray-50 dark:hover:bg-zinc-700';
 iconElement = isSelected
 ? <CheckCircle2 size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
 : <Circle size={18} className="text-gray-300 shrink-0" />;
 }

 return (
 <button
 key={opt.id}
 onClick={() => !isRevealed && setAnswer(currentQ.id, { selectedOptionId: opt.id })}
 disabled={isRevealed}
 className={`flex w-full items-center gap-2.5 sm:gap-3 rounded-lg border p-2.5 sm:p-4 text-left transition-colors ${
 isRevealed ? 'cursor-default' : 'cursor-pointer'
 } ${optionClass}`}
 >
 {iconElement}
 <span className={`text-xs sm:text-sm break-words min-w-0 leading-snug ${
 isRevealed
 ? isCorrectOption
 ? 'text-green-900 font-medium'
 : isWrongSelected
 ? 'text-red-900 font-medium'
 : 'text-gray-500 dark:text-zinc-400'
 : isSelected
 ? 'text-blue-900 font-medium'
 : 'text-gray-700 dark:text-zinc-300'
 }`}>
 {opt.optionText}
 </span>
 {isRevealed && isCorrectOption && (
 <Badge variant="success" className="ml-auto text-[10px] shrink-0">
 {t('quiz.correctAnswer')}
 </Badge>
 )}
 {isRevealed && isWrongSelected && (
 <Badge variant="destructive" className="ml-auto text-[10px] shrink-0">
 {t('quiz.yourAnswer')}
 </Badge>
 )}
 </button>
 );
 })
 )}
 {isCurrentRevealed && currentQ.explanation && (
 <div className="mt-2 rounded-md bg-blue-50 dark:bg-blue-500/8 px-3 py-2 text-xs sm:text-sm text-blue-800">
 <strong>{t('quiz.explanation')}:</strong> {currentQ.explanation}
 </div>
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
 const revealData = revealed[q.id];
 let dotClass = '';
 if (i === currentIndex) {
 dotClass = 'bg-blue-600 text-white';
 } else if (revealData) {
 dotClass = revealData.isCorrect
 ? 'bg-green-500 text-white'
 : 'bg-red-500 text-white';
 } else if (answered) {
 dotClass = 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-300';
 } else {
 dotClass = 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:bg-zinc-600';
 }
 return (
 <button
 key={q.id}
 onClick={() => setCurrentIndex(i)}
 className={`h-6 w-6 sm:h-8 sm:w-8 rounded-full text-[10px] sm:text-xs font-medium transition-colors cursor-pointer shrink-0 ${dotClass}`}
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
 <span className="text-[10px] text-gray-400 dark:text-zinc-500 sm:hidden">
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
