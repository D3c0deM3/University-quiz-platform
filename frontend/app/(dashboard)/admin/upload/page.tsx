'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { materialsApi, subjectsApi } from '@/lib/api';
import type { Subject } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, FileText, X, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UploadPage() {
 const router = useRouter();
 const { t } = useTranslation();
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [subjectId, setSubjectId] = useState('');
 const [file, setFile] = useState<File | null>(null);
 const [uploading, setUploading] = useState(false);
 const [dragOver, setDragOver] = useState(false);
 const [numQuestions, setNumQuestions] = useState(10);
 const [allQuestions, setAllQuestions] = useState(false);
 const [questionsWithMaterial, setQuestionsWithMaterial] = useState(false);
 const [questionsFile, setQuestionsFile] = useState<File | null>(null);
 const [dragOverQuestions, setDragOverQuestions] = useState(false);

 useEffect(() => {
 subjectsApi.list(1, 100).then((res) => {
 const data = res.data.data || res.data || [];
 setSubjects(data);
 });
 }, []);

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setDragOver(false);
 const f = e.dataTransfer.files?.[0];
 if (f) setFile(f);
 };

 const handleDropQuestions = (e: React.DragEvent) => {
 e.preventDefault();
 setDragOverQuestions(false);
 const f = e.dataTransfer.files?.[0];
 if (f) setQuestionsFile(f);
 };

 const handleUpload = async () => {
 if (questionsWithMaterial) {
 if (!questionsFile || !file || !subjectId) {
 toast.error(t('adminUpload.errorBothFiles'));
 return;
 }
 setUploading(true);
 try {
 await materialsApi.uploadWithQuestions(questionsFile, file, subjectId, allQuestions ? 0 : numQuestions);
 toast.success(t('adminUpload.success'));
 router.push('/admin/materials');
 } catch (err: unknown) {
 const message =
 (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
 t('adminUpload.error');
 toast.error(message);
 } finally {
 setUploading(false);
 }
 } else {
 if (!file || !subjectId) {
 toast.error(t('adminUpload.error'));
 return;
 }
 setUploading(true);
 try {
 await materialsApi.upload(file, subjectId, allQuestions ? 0 : numQuestions);
 toast.success(t('adminUpload.success'));
 router.push('/admin/materials');
 } catch (err: unknown) {
 const message =
 (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
 t('adminUpload.error');
 toast.error(message);
 } finally {
 setUploading(false);
 }
 }
 };

 const FileUploadZone = ({
 id,
 currentFile,
 onFileChange,
 onDrop,
 isDragOver,
 onDragOver,
 onDragLeave,
 label,
 description,
 }: {
 id: string;
 currentFile: File | null;
 onFileChange: (f: File | null) => void;
 onDrop: (e: React.DragEvent) => void;
 isDragOver: boolean;
 onDragOver: () => void;
 onDragLeave: () => void;
 label: string;
 description: string;
 }) => (
 <>
 {!currentFile ? (
 <div
 onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
 onDragLeave={onDragLeave}
 onDrop={onDrop}
 className={cn(
 'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer',
 isDragOver
 ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/8'
 : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400',
 )}
 onClick={() => document.getElementById(id)?.click()}
 >
 <Upload size={40} className="text-gray-400 dark:text-zinc-500 mb-3" />
 <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">{label}</p>
 <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{description}</p>
 <input
 id={id}
 type="file"
 className="hidden"
 accept=".pdf,.docx,.pptx,.xlsx,.xls,.png,.jpg,.jpeg"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) onFileChange(f);
 }}
 />
 </div>
 ) : (
 <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-zinc-700 p-4">
 <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
 <FileText size={20} className="text-blue-600 dark:text-blue-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">{currentFile.name}</p>
 <p className="text-sm text-gray-500 dark:text-zinc-400">{(currentFile.size / 1024).toFixed(1)} KB</p>
 </div>
 <button
 onClick={() => onFileChange(null)}
 className="rounded-lg p-1.5 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>
 )}
 </>
 );

 return (
 <div className="max-w-2xl mx-auto space-y-6">
 <div>
 <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('adminUpload.title')}</h1>
 <p className="text-gray-500 dark:text-zinc-400">{t('adminUpload.subtitle')}</p>
 </div>

 <Card>
 <CardHeader>
 <CardTitle>{t('adminUpload.selectSubject')}</CardTitle>
 <CardDescription>{t('adminUpload.subtitle')}</CardDescription>
 </CardHeader>
 <CardContent>
 <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
 <option value="">{t('adminUpload.selectSubject')}…</option>
 {subjects.map((s) => (
 <option key={s.id} value={s.id}>
 {s.name} {s.code ? `(${s.code})` : ''}
 </option>
 ))}
 </Select>
 </CardContent>
 </Card>

 {/* Scenario 3 toggle */}
 <Card>
 <CardContent className="pt-6">
 <label className="flex items-start gap-3 cursor-pointer select-none">
 <input
 type="checkbox"
 checked={questionsWithMaterial}
 onChange={(e) => {
 setQuestionsWithMaterial(e.target.checked);
 if (!e.target.checked) {
 setQuestionsFile(null);
 }
 }}
 className="mt-0.5 h-5 w-5 rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
 />
 <div>
 <p className="font-medium text-gray-900 dark:text-zinc-100">
 {t('adminUpload.questionsWithMaterial') || 'Upload questions with study material'}
 </p>
 <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
 {t('adminUpload.questionsWithMaterialDesc') || 'Upload a questions file and a study material file. AI will find answers strictly from the study material, not from its own knowledge.'}
 </p>
 </div>
 </label>
 </CardContent>
 </Card>

 {questionsWithMaterial && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <HelpCircle size={18} className="text-amber-500" />
 {t('adminUpload.questionsFile') || 'Questions File'}
 </CardTitle>
 <CardDescription>
 {t('adminUpload.questionsFileDesc') || 'Upload the file containing exam questions, test papers, or question banks'}
 </CardDescription>
 </CardHeader>
 <CardContent>
 <FileUploadZone
 id="questions-file-input"
 currentFile={questionsFile}
 onFileChange={setQuestionsFile}
 onDrop={handleDropQuestions}
 isDragOver={dragOverQuestions}
 onDragOver={() => setDragOverQuestions(true)}
 onDragLeave={() => setDragOverQuestions(false)}
 label={t('adminUpload.chooseQuestionsFile') || 'Choose questions file or drag and drop'}
 description={t('adminUpload.supported')}
 />
 </CardContent>
 </Card>
 )}

 <Card>
 <CardHeader>
 <CardTitle>
 {questionsWithMaterial
 ? (t('adminUpload.studyMaterialFile') || 'Study Material File')
 : t('adminUpload.selectedFile')
 }
 </CardTitle>
 <CardDescription>
 {questionsWithMaterial
 ? (t('adminUpload.studyMaterialFileDesc') || 'Upload the study material from which answers to the questions will be found')
 : t('adminUpload.supported')
 }
 </CardDescription>
 </CardHeader>
 <CardContent>
 <FileUploadZone
 id="file-input"
 currentFile={file}
 onFileChange={setFile}
 onDrop={handleDrop}
 isDragOver={dragOver}
 onDragOver={() => setDragOver(true)}
 onDragLeave={() => setDragOver(false)}
 label={questionsWithMaterial
 ? (t('adminUpload.chooseStudyMaterial') || 'Choose study material or drag and drop')
 : t('adminUpload.chooseFile')
 }
 description={t('adminUpload.supported')}
 />
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{t('adminUpload.numQuestions') || 'Number of Questions'}</CardTitle>
 <CardDescription>
 {questionsWithMaterial
 ? (t('adminUpload.numQuestionsDescDual') || 'Maximum number of questions to extract from the questions file')
 : (t('adminUpload.numQuestionsDesc') || 'How many quiz questions should the AI generate from this material?')
 }
 </CardDescription>
 </CardHeader>
 <CardContent>
 <label className="flex items-center gap-3 mb-3 cursor-pointer select-none">
 <input
 type="checkbox"
 checked={allQuestions}
 onChange={(e) => setAllQuestions(e.target.checked)}
 className="h-5 w-5 rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
 />
 <div>
 <p className="font-medium text-gray-900 dark:text-zinc-100 text-sm">
 {t('adminUpload.allQuestions') || 'Extract all questions from material'}
 </p>
 <p className="text-xs text-gray-500 dark:text-zinc-400">
 {t('adminUpload.allQuestionsDesc') || 'AI will detect and extract every question found in the material'}
 </p>
 </div>
 </label>
 {!allQuestions && (
 <>
 <Input
 type="number"
 min={1}
 value={numQuestions}
 onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
 placeholder="10"
 />
 <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{t('adminUpload.numQuestionsHint') || 'Min: 1. Default: 10'}</p>
 </>
 )}
 </CardContent>
 </Card>

 <Button
 onClick={handleUpload}
 loading={uploading}
 disabled={questionsWithMaterial ? (!questionsFile || !file || !subjectId) : (!file || !subjectId)}
 className="w-full"
 size="lg"
 >
 <Upload size={18} /> {uploading ? t('adminUpload.uploading') : t('adminUpload.submit')}
 </Button>
 </div>
 );
}
