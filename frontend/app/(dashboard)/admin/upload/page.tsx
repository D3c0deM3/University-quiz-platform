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
import { Upload, FileText, X } from 'lucide-react';
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

 const handleUpload = async () => {
 if (!file || !subjectId) {
 toast.error(t('adminUpload.error'));
 return;
 }
 setUploading(true);
 try {
 await materialsApi.upload(file, subjectId, numQuestions);
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
 };

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

 <Card>
 <CardHeader>
 <CardTitle>{t('adminUpload.selectedFile')}</CardTitle>
 <CardDescription>
 {t('adminUpload.supported')}
 </CardDescription>
 </CardHeader>
 <CardContent>
 {!file ? (
 <div
 onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
 onDragLeave={() => setDragOver(false)}
 onDrop={handleDrop}
 className={cn(
 'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer',
 dragOver
 ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/8'
 : 'border-gray-300 dark:border-zinc-600 hover:border-gray-400',
 )}
 onClick={() => document.getElementById('file-input')?.click()}
 >
 <Upload size={40} className="text-gray-400 dark:text-zinc-500 mb-3" />
 <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
 {t('adminUpload.chooseFile')}
 </p>
 <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">{t('adminUpload.supported')}</p>
 <input
 id="file-input"
 type="file"
 className="hidden"
 accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
 onChange={(e) => {
 const f = e.target.files?.[0];
 if (f) setFile(f);
 }}
 />
 </div>
 ) : (
 <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-zinc-700 p-4">
 <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
 <FileText size={20} className="text-blue-600 dark:text-blue-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">{file.name}</p>
 <p className="text-sm text-gray-500 dark:text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
 </div>
 <button
 onClick={() => setFile(null)}
 className="rounded-lg p-1.5 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
 >
 <X size={18} />
 </button>
 </div>
 )}
 </CardContent>
 </Card>

 <Card>
 <CardHeader>
 <CardTitle>{t('adminUpload.numQuestions') || 'Number of Questions'}</CardTitle>
 <CardDescription>{t('adminUpload.numQuestionsDesc') || 'How many quiz questions should the AI generate from this material?'}</CardDescription>
 </CardHeader>
 <CardContent>
 <Input
 type="number"
 min={1}
 value={numQuestions}
 onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value, 10) || 1))}
 placeholder="10"
 />
 <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{t('adminUpload.numQuestionsHint') || 'Min: 1. Default: 10'}</p>
 </CardContent>
 </Card>

 <Button
 onClick={handleUpload}
 loading={uploading}
 disabled={!file || !subjectId}
 className="w-full"
 size="lg"
 >
 <Upload size={18} /> {uploading ? t('adminUpload.uploading') : t('adminUpload.submit')}
 </Button>
 </div>
 );
}
