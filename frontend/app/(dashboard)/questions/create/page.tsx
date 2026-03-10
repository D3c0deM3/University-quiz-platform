'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { questionsApi, subjectsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n';
import type { Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CreateQuestionPage() {
 const router = useRouter();
 const { user } = useAuthStore();
 const { t } = useTranslation();
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [questionText, setQuestionText] = useState('');
 const [answerText, setAnswerText] = useState('');
 const [subjectId, setSubjectId] = useState('');
 const [image, setImage] = useState<File | null>(null);
 const [imagePreview, setImagePreview] = useState<string | null>(null);
 const [submitting, setSubmitting] = useState(false);

 useEffect(() => {
 subjectsApi.list(1, 100).then((res) => {
 const data = res.data.data || res.data || [];
 setSubjects(data);
 if (data.length > 0 && !subjectId) {
 setSubjectId(data[0].id);
 }
 });
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 if (!file.type.startsWith('image/')) {
 toast.error(t('createQuestion.selectImageFile'));
 return;
 }
 if (file.size > 10 * 1024 * 1024) {
 toast.error(t('createQuestion.imageTooLarge'));
 return;
 }
 setImage(file);
 setImagePreview(URL.createObjectURL(file));
 }
 };

 const removeImage = () => {
 setImage(null);
 if (imagePreview) URL.revokeObjectURL(imagePreview);
 setImagePreview(null);
 };

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!questionText.trim() || !answerText.trim() || !subjectId) {
 toast.error(t('createQuestion.fillRequired'));
 return;
 }

 setSubmitting(true);
 try {
 await questionsApi.create(
 { questionText: questionText.trim(), answerText: answerText.trim(), subjectId },
 image || undefined,
 );

 const isAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';
 toast.success(
 isAdmin
 ? t('createQuestion.createdAndPublished')
 : t('createQuestion.submittedForReview'),
 );
 router.push('/questions');
 } catch (err: any) {
 toast.error(err.response?.data?.message || t('createQuestion.error'));
 } finally {
 setSubmitting(false);
 }
 };

 const isAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';

 return (
 <div className="mx-auto max-w-2xl space-y-6">
 <div className="flex items-center gap-3">
 <Link href="/questions">
 <Button variant="ghost" size="sm">
 <ArrowLeft size={16} className="mr-1" /> {t('common.back')}
 </Button>
 </Link>
 <div>
 <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('questions.addQuestion')}</h1>
 <p className="text-gray-500 dark:text-zinc-400">
 {isAdmin
 ? t('createQuestion.publishedImmediately')
 : t('createQuestion.submitForReview')}
 </p>
 </div>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>{t('createQuestion.questionDetails')}</CardTitle>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleSubmit} className="space-y-5">
 {/* Subject */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
 {t('createQuestion.subject')} <span className="text-red-500">*</span>
 </label>
 <Select
 value={subjectId}
 onChange={(e) => setSubjectId(e.target.value)}
 required
 >
 <option value="">{t('createQuestion.selectASubject')}</option>
 {subjects.map((s) => (
 <option key={s.id} value={s.id}>{s.name}</option>
 ))}
 </Select>
 </div>

 {/* Question */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
 {t('questions.question')} <span className="text-red-500">*</span>
 </label>
 <Textarea
 placeholder={t('createQuestion.enterQuestion')}
 value={questionText}
 onChange={(e) => setQuestionText(e.target.value)}
 rows={3}
 required
 maxLength={5000}
 />
 <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">{questionText.length}/5000</p>
 </div>

 {/* Answer */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
 {t('questions.answer')} <span className="text-red-500">*</span>
 </label>
 <Textarea
 placeholder={t('createQuestion.enterAnswer')}
 value={answerText}
 onChange={(e) => setAnswerText(e.target.value)}
 rows={4}
 required
 maxLength={10000}
 />
 <p className="mt-1 text-xs text-gray-400 dark:text-zinc-500">{answerText.length}/10000</p>
 </div>

 {/* Image Upload */}
 <div>
 <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1">
 {t('createQuestion.image')} <span className="text-gray-400 dark:text-zinc-500">{t('createQuestion.imageOptional')}</span>
 </label>
 {imagePreview ? (
 <div className="relative inline-block">
 <img
 src={imagePreview}
 alt="Preview"
 className="max-w-full max-h-48 rounded-lg border"
 />
 <button
 type="button"
 onClick={removeImage}
 className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
 >
 <X size={14} />
 </button>
 </div>
 ) : (
 <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 dark:border-zinc-600 p-6 hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
 <Upload size={24} className="text-gray-400 dark:text-zinc-500 mb-2" />
 <span className="text-sm text-gray-500 dark:text-zinc-400">{t('createQuestion.clickToUpload')}</span>
 <span className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t('createQuestion.imageFormats')}</span>
 <input
 type="file"
 className="hidden"
 accept="image/*"
 onChange={handleImageChange}
 />
 </label>
 )}
 </div>

 {/* Info notice for students */}
 {!isAdmin && (
 <div className="rounded-lg bg-amber-50 dark:bg-amber-500/8 border border-amber-200 p-4 text-sm text-amber-800">
 <strong>{t('createQuestion.note')}</strong> {t('createQuestion.reviewNote')}
 </div>
 )}

 {/* Submit */}
 <div className="flex justify-end gap-3">
 <Link href="/questions">
 <Button variant="outline" type="button">{t('common.cancel')}</Button>
 </Link>
 <Button type="submit" disabled={submitting}>
 {submitting ? t('createQuestion.submitting') : isAdmin ? t('createQuestion.createAndPublish') : t('createQuestion.submitForReviewBtn')}
 </Button>
 </div>
 </form>
 </CardContent>
 </Card>
 </div>
 );
}
