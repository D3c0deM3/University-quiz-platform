'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { materialsApi, subjectsApi, quizzesApi } from '@/lib/api';
import type { Subject } from '@/lib/types';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload, FileText, X, HelpCircle, Plus, Trash2, CheckCircle, PenLine, Sparkles, Type } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManualQuestion {
  questionText: string;
  correctAnswer: string;
}

function emptyQuestion(): ManualQuestion {
  return {
    questionText: '',
    correctAnswer: '',
  };
}

export default function UploadPage() {
 const router = useRouter();
 const { t } = useTranslation();
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [subjectId, setSubjectId] = useState('');
 const [files, setFiles] = useState<File[]>([]);
 const [uploading, setUploading] = useState(false);
 const [dragOver, setDragOver] = useState(false);
 const [numQuestions, setNumQuestions] = useState<number | ''>(10);
 const [allQuestions, setAllQuestions] = useState(false);
 const [questionsWithMaterial, setQuestionsWithMaterial] = useState(false);
 const [questionsFile, setQuestionsFile] = useState<File | null>(null);
 const [studyMaterialFiles, setStudyMaterialFiles] = useState<File[]>([]);
 const [dragOverQuestions, setDragOverQuestions] = useState(false);
 const [dragOverStudyMaterials, setDragOverStudyMaterials] = useState(false);

 // Tab state: 'file', 'manual', or 'text'
 const [activeTab, setActiveTab] = useState<'file' | 'manual' | 'text' | 'json'>('file');

 // Manual question entry state
 const [quizTitle, setQuizTitle] = useState('');
 const [manualQuestions, setManualQuestions] = useState<ManualQuestion[]>([emptyQuestion()]);
 const [creatingQuiz, setCreatingQuiz] = useState(false);

 // Text upload state
 const [textQuestions, setTextQuestions] = useState('');
 const [textMaterialFiles, setTextMaterialFiles] = useState<File[]>([]);
 const [dragOverTextMaterial, setDragOverTextMaterial] = useState(false);
 const [textNumQuestions, setTextNumQuestions] = useState<number | ''>(0);
 const [textAllQuestions, setTextAllQuestions] = useState(true);
 const [submittingText, setSubmittingText] = useState(false);
 const [jsonFile, setJsonFile] = useState<File | null>(null);
 const [jsonTitle, setJsonTitle] = useState('');
 const [uploadingJson, setUploadingJson] = useState(false);

 useEffect(() => {
 subjectsApi.list(1, 100).then((res) => {
 const data = res.data.data || res.data || [];
 setSubjects(data);
 });
 }, []);

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setDragOver(false);
 const incoming = Array.from(e.dataTransfer.files || []);
 addFiles(incoming);
 };

 const addFiles = (incoming: File[]) => {
 if (incoming.length === 0) return;
 setFiles((prev) => mergeUniqueFiles(prev, incoming));
 };

 const removeFile = (index: number) => {
 setFiles((prev) => prev.filter((_, i) => i !== index));
 };

 const handleDropQuestions = (e: React.DragEvent) => {
 e.preventDefault();
 setDragOverQuestions(false);
 const f = e.dataTransfer.files?.[0];
 if (f) setQuestionsFile(f);
 };

 const mergeUniqueFiles = (existing: File[], incoming: File[]) => {
 const seen = new Set(
 existing.map((f) => `${f.name}-${f.size}-${f.lastModified}`),
 );
 const uniqueIncoming = incoming.filter((f) => {
 const key = `${f.name}-${f.size}-${f.lastModified}`;
 if (seen.has(key)) return false;
 seen.add(key);
 return true;
 });
 return [...existing, ...uniqueIncoming];
 };

 const addStudyMaterialFiles = (incoming: File[]) => {
 if (incoming.length === 0) return;
 setStudyMaterialFiles((prev) => mergeUniqueFiles(prev, incoming));
 };

 const handleDropStudyMaterials = (e: React.DragEvent) => {
 e.preventDefault();
 setDragOverStudyMaterials(false);
 const incoming = Array.from(e.dataTransfer.files || []);
 addStudyMaterialFiles(incoming);
 };

 const removeStudyMaterialFile = (index: number) => {
 setStudyMaterialFiles((prev) => prev.filter((_, i) => i !== index));
 };

 const handleUpload = async () => {
 if (questionsWithMaterial) {
 if (!questionsFile || studyMaterialFiles.length === 0 || !subjectId) {
 toast.error(t('adminUpload.errorBothFiles'));
 return;
 }
 setUploading(true);
 try {
 await materialsApi.uploadWithQuestions(
 questionsFile,
 studyMaterialFiles,
 subjectId,
 allQuestions ? 0 : (numQuestions || 10),
 );
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
 if (files.length === 0 || !subjectId) {
 toast.error(t('adminUpload.error'));
 return;
 }
 setUploading(true);
 try {
 await materialsApi.upload(files, subjectId, allQuestions ? 0 : (numQuestions || 10));
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

 // ── Manual question handlers ──

 const updateQuestion = (index: number, field: keyof ManualQuestion, value: string) => {
   setManualQuestions((prev) => prev.map((q, i) => i === index ? { ...q, [field]: value } : q));
 };

 const addQuestion = () => {
   setManualQuestions((prev) => [...prev, emptyQuestion()]);
 };

 const removeQuestion = (index: number) => {
   setManualQuestions((prev) => prev.filter((_, i) => i !== index));
 };

 const handleCreateManualQuiz = async () => {
   if (!subjectId) {
     toast.error(t('adminUpload.error'));
     return;
   }
   if (manualQuestions.length === 0) {
     toast.error(t('manualUpload.noQuestions'));
     return;
   }
   for (const q of manualQuestions) {
     if (!q.questionText.trim()) {
       toast.error(t('manualUpload.needQuestionText'));
       return;
     }
     if (!q.correctAnswer.trim()) {
       toast.error(t('manualUpload.needCorrectAnswer'));
       return;
     }
   }

   setCreatingQuiz(true);
   try {
     await quizzesApi.createManualAi({
       subjectId,
       title: quizTitle.trim() || undefined,
       questions: manualQuestions.map((q) => ({
         questionText: q.questionText,
         correctAnswer: q.correctAnswer,
       })),
     });
     toast.success(t('manualUpload.success', { count: String(manualQuestions.length) }));
     setManualQuestions([emptyQuestion()]);
     setQuizTitle('');
     router.push('/admin/materials');
   } catch (err: unknown) {
     const message =
       (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
       t('manualUpload.error');
     toast.error(message);
   } finally {
     setCreatingQuiz(false);
   }
 };

 
 const handleJsonUpload = async () => {
   if (!subjectId) {
     toast.error('Please select a subject first!');
     return;
   }
   if (!jsonFile) {
     toast.error('Please select a JSON file!');
     return;
   }
   try {
     setUploadingJson(true);
     await materialsApi.uploadJson(jsonFile, subjectId, jsonTitle);
     toast.success('JSON file processed and quiz created successfully!');
     router.push('/admin/materials');
   } catch (error: any) {
     toast.error(error.response?.data?.message || 'Failed to upload JSON file');
   } finally {
     setUploadingJson(false);
   }
 };

 const handleUploadText = async () => {
   if (!subjectId) {
     toast.error(t('adminUpload.error'));
     return;
   }
   if (!textQuestions.trim()) {
     toast.error(t('textUpload.needQuestions'));
     return;
   }
   setSubmittingText(true);
   try {
     await materialsApi.uploadText(
       textQuestions,
       textMaterialFiles,
       subjectId,
       textAllQuestions ? 0 : (textNumQuestions || 10),
     );
     toast.success(t('textUpload.success'));
     setTextQuestions('');
     setTextMaterialFiles([]);
     router.push('/admin/materials');
   } catch (err: unknown) {
     const message =
       (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
       t('textUpload.error');
     toast.error(message);
   } finally {
     setSubmittingText(false);
   }
 };

 const addTextMaterialFiles = (incoming: File[]) => {
   if (incoming.length === 0) return;
   setTextMaterialFiles((prev) => mergeUniqueFiles(prev, incoming));
 };

 const handleDropTextMaterial = (e: React.DragEvent) => {
   e.preventDefault();
   setDragOverTextMaterial(false);
   const incoming = Array.from(e.dataTransfer.files || []);
   addTextMaterialFiles(incoming);
 };

 const removeTextMaterialFile = (index: number) => {
   setTextMaterialFiles((prev) => prev.filter((_, i) => i !== index));
 };

 const MultiFileUploadZone = ({
 id,
 files: zoneFiles,
 onAddFiles,
 onRemoveFile,
 onDrop,
 isDragOver,
 onDragOver,
 onDragLeave,
 label,
 description,
 }: {
 id: string;
 files: File[];
 onAddFiles: (files: File[]) => void;
 onRemoveFile: (index: number) => void;
 onDrop: (e: React.DragEvent) => void;
 isDragOver: boolean;
 onDragOver: () => void;
 onDragLeave: () => void;
 label: string;
 description: string;
 }) => (
 <div className="space-y-3">
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
 multiple
 className="hidden"
 accept=".pdf,.doc,.docx,.pptx,.xlsx,.xls,.png,.jpg,.jpeg"
 onChange={(e) => {
 const incoming = Array.from(e.target.files || []);
 onAddFiles(incoming);
 if (e.target) e.target.value = '';
 }}
 />
 </div>

 {zoneFiles.length > 0 && (
 <div className="space-y-2">
 {zoneFiles.map((f, index) => (
 <div
 key={`${f.name}-${f.size}-${f.lastModified}-${index}`}
 className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-zinc-700 p-3"
 >
 <div className="flex h-9 w-9 items-center justify-center rounded bg-blue-100 dark:bg-blue-500/10">
 <FileText size={18} className="text-blue-600 dark:text-blue-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-sm text-gray-900 dark:text-zinc-100 truncate">
 {f.name}
 </p>
 <p className="text-xs text-gray-500 dark:text-zinc-400">
 {(f.size / 1024).toFixed(1)} KB
 </p>
 </div>
 <button
 type="button"
 onClick={() => onRemoveFile(index)}
 className="rounded-lg p-1.5 text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-700 hover:text-gray-600 dark:hover:text-zinc-300 cursor-pointer"
 >
 <X size={16} />
 </button>
 </div>
 ))}
 </div>
 )}
 </div>
 );

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
 accept=".pdf,.doc,.docx,.pptx,.xlsx,.xls,.png,.jpg,.jpeg"
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

 {/* Tab Switcher */}
 <div className="flex rounded-lg border border-gray-200 dark:border-zinc-700 overflow-hidden">
   <button
     type="button"
     onClick={() => setActiveTab('file')}
     className={cn(
       'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
       activeTab === 'file'
         ? 'bg-blue-600 text-white'
         : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-750',
     )}
   >
     <Upload size={16} />
     {t('manualUpload.tabFile')}
   </button>
   <button
     type="button"
     onClick={() => setActiveTab('manual')}
     className={cn(
       'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
       activeTab === 'manual'
         ? 'bg-blue-600 text-white'
         : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-750',
     )}
   >
     <PenLine size={16} />
     {t('manualUpload.tabManual')}
   </button>
   <button
     type="button"
     onClick={() => setActiveTab('text')}
     className={cn(
       'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
       activeTab === 'text'
         ? 'bg-blue-600 text-white'
         : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-750',
     )}
   >
     <Type size={16} />
     {t('manualUpload.tabText')}
   </button>

   <button
     type="button"
     onClick={() => setActiveTab('json')}
     className={cn(
       'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
       activeTab === 'json'
         ? 'bg-blue-600 text-white'
         : 'bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-750',
     )}
   >
     <FileText size={16} />
     JSON
   </button>
  
 </div>

 {/* Subject Selection (shared between both tabs) */}
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

 {activeTab === 'file' ? (
   <>
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
     setStudyMaterialFiles([]);
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

     {questionsWithMaterial ? (
     <Card>
     <CardHeader>
     <CardTitle>{t('adminUpload.studyMaterialFiles') || 'Study Material Files'}</CardTitle>
     <CardDescription>
     {t('adminUpload.studyMaterialFilesDesc') || 'Upload one or more study material files from which answers will be found'}
     </CardDescription>
     </CardHeader>
     <CardContent>
     <MultiFileUploadZone
     id="study-material-files-input"
     files={studyMaterialFiles}
     onAddFiles={addStudyMaterialFiles}
     onRemoveFile={removeStudyMaterialFile}
     onDrop={handleDropStudyMaterials}
     isDragOver={dragOverStudyMaterials}
     onDragOver={() => setDragOverStudyMaterials(true)}
     onDragLeave={() => setDragOverStudyMaterials(false)}
     label={t('adminUpload.chooseStudyMaterials') || 'Choose study materials or drag and drop'}
     description={t('adminUpload.supported')}
     />
     </CardContent>
     </Card>
     ) : (
     <Card>
     <CardHeader>
     <CardTitle>{t('adminUpload.selectedFile')}</CardTitle>
     <CardDescription>{t('adminUpload.supported')}</CardDescription>
     </CardHeader>
     <CardContent>
     <MultiFileUploadZone
     id="file-input"
     files={files}
     onAddFiles={addFiles}
     onRemoveFile={removeFile}
     onDrop={handleDrop}
     isDragOver={dragOver}
     onDragOver={() => setDragOver(true)}
     onDragLeave={() => setDragOver(false)}
     label={t('adminUpload.chooseFile')}
     description={t('adminUpload.supported')}
     />
     </CardContent>
     </Card>
     )}

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
     onChange={(e) => setNumQuestions(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
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
     disabled={questionsWithMaterial ? (!questionsFile || studyMaterialFiles.length === 0 || !subjectId) : (files.length === 0 || !subjectId)}
     className="w-full"
     size="lg"
     >
     <Upload size={18} /> {uploading ? t('adminUpload.uploading') : t('adminUpload.submit')}
     </Button>
   </>
 ) : activeTab === 'manual' ? (
   /* ── Manual Question Entry Tab ── */
   <>
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <PenLine size={18} className="text-blue-500" />
           {t('manualUpload.title')}
         </CardTitle>
         <CardDescription>{t('manualUpload.description')}</CardDescription>
       </CardHeader>
       <CardContent>
         <Input
           value={quizTitle}
           onChange={(e) => setQuizTitle(e.target.value)}
           placeholder={t('manualUpload.quizTitlePlaceholder')}
         />
       </CardContent>
     </Card>

     {manualQuestions.map((q, qIndex) => (
       <Card key={qIndex}>
         <CardHeader className="pb-3">
           <div className="flex items-center justify-between">
             <CardTitle className="text-base">
               {t('manualUpload.questionNum', { num: String(qIndex + 1) })}
             </CardTitle>
             {manualQuestions.length > 1 && (
               <button
                 type="button"
                 onClick={() => removeQuestion(qIndex)}
                 className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 cursor-pointer"
               >
                 <Trash2 size={14} />
                 {t('manualUpload.removeQuestion')}
               </button>
             )}
           </div>
         </CardHeader>
         <CardContent className="space-y-4">
           {/* Question text */}
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
               {t('manualUpload.questionText')}
             </label>
             <textarea
               value={q.questionText}
               onChange={(e) => updateQuestion(qIndex, 'questionText', e.target.value)}
               placeholder={t('manualUpload.questionPlaceholder')}
               rows={2}
               className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
             />
           </div>

           {/* Correct answer */}
           <div>
             <label className="block text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1.5">
               {t('manualUpload.correctAnswer')}
             </label>
             <Input
               value={q.correctAnswer}
               onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
               placeholder={t('manualUpload.correctAnswerPlaceholder')}
             />
           </div>

           {/* AI hint */}
           <p className="text-xs text-gray-400 dark:text-zinc-500 italic flex items-center gap-1">
             <Sparkles size={12} />
             {t('manualUpload.aiHint')}
           </p>
         </CardContent>
       </Card>
     ))}

     {/* Add Question button */}
     <button
       type="button"
       onClick={addQuestion}
       className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-600 p-4 text-sm font-medium text-gray-600 dark:text-zinc-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
     >
       <Plus size={18} />
       {t('manualUpload.addQuestion')}
     </button>

     {/* Submit button */}
     <Button
       onClick={handleCreateManualQuiz}
       loading={creatingQuiz}
       disabled={!subjectId || manualQuestions.length === 0 || creatingQuiz}
       className="w-full"
       size="lg"
     >
       <CheckCircle size={18} /> {creatingQuiz ? t('manualUpload.creating') : t('manualUpload.createQuiz')}
     </Button>
   </>
 ) : activeTab === 'text' ? (
   /* ── AI Text Tab ── */
   <>
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <Type size={18} className="text-purple-500" />
           {t('textUpload.title')}
         </CardTitle>
         <CardDescription>{t('textUpload.description')}</CardDescription>
       </CardHeader>
     </Card>

     <Card>
       <CardHeader>
         <CardTitle className="text-base">{t('textUpload.questionsLabel')}</CardTitle>
         <CardDescription>{t('textUpload.questionsDesc')}</CardDescription>
       </CardHeader>
       <CardContent>
         <textarea
           value={textQuestions}
           onChange={(e) => setTextQuestions(e.target.value)}
           placeholder={t('textUpload.questionsPlaceholder')}
           rows={10}
           className="w-full rounded-lg border border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-2 text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-y"
         />
         {textQuestions.trim() && (
           <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
             {textQuestions.trim().length.toLocaleString()} {t('textUpload.characters')}
           </p>
         )}
       </CardContent>
     </Card>

     <Card>
       <CardHeader>
         <CardTitle className="text-base">{t('textUpload.materialLabel')}</CardTitle>
         <CardDescription>{t('textUpload.materialDesc')}</CardDescription>
       </CardHeader>
       <CardContent>
         <MultiFileUploadZone
           id="text-material-files-input"
           files={textMaterialFiles}
           onAddFiles={addTextMaterialFiles}
           onRemoveFile={removeTextMaterialFile}
           onDrop={handleDropTextMaterial}
           isDragOver={dragOverTextMaterial}
           onDragOver={() => setDragOverTextMaterial(true)}
           onDragLeave={() => setDragOverTextMaterial(false)}
           label={t('textUpload.chooseMaterialFiles')}
           description={t('adminUpload.supported')}
         />
       </CardContent>
     </Card>

     <Card>
       <CardHeader>
         <CardTitle className="text-base">{t('adminUpload.numQuestions')}</CardTitle>
       </CardHeader>
       <CardContent>
         <label className="flex items-center gap-3 mb-3 cursor-pointer select-none">
           <input
             type="checkbox"
             checked={textAllQuestions}
             onChange={(e) => setTextAllQuestions(e.target.checked)}
             className="h-5 w-5 rounded border-gray-300 dark:border-zinc-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
           />
           <div>
             <p className="font-medium text-gray-900 dark:text-zinc-100 text-sm">
               {t('adminUpload.allQuestions')}
             </p>
             <p className="text-xs text-gray-500 dark:text-zinc-400">
               {t('adminUpload.allQuestionsDesc')}
             </p>
           </div>
         </label>
         {!textAllQuestions && (
           <>
             <Input
               type="number"
               min={1}
               value={textNumQuestions}
               onChange={(e) => setTextNumQuestions(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value, 10) || 1))}
               placeholder="10"
             />
             <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">{t('adminUpload.numQuestionsHint')}</p>
           </>
         )}
       </CardContent>
     </Card>

     <Button
       onClick={handleUploadText}
       loading={submittingText}
       disabled={!subjectId || !textQuestions.trim() || submittingText}
       className="w-full"
       size="lg"
     >
       <Sparkles size={18} /> {submittingText ? t('textUpload.submitting') : t('textUpload.submit')}
     </Button>
   </>
 
 ) : activeTab === 'json' ? (
   <>
     <Card>
       <CardHeader>
         <CardTitle className="flex items-center gap-2">
           <FileText size={18} className="text-orange-500" />
           Upload JSON File
         </CardTitle>
         <CardDescription>Upload a structured JSON file containing exact questions and options to instantly create a quiz without AI extraction.</CardDescription>
       </CardHeader>
       <CardContent className="space-y-4">
         <Input
           value={jsonTitle}
           onChange={(e) => setJsonTitle(e.target.value)}
           placeholder="Optional Quiz Title"
           className="w-full"
         />
         <div className="border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
           <input
             type="file"
             accept=".json,application/json"
             id="json-upload"
             className="hidden"
             onChange={(e) => {
               if (e.target.files && e.target.files.length > 0) {
                 setJsonFile(e.target.files[0]);
               }
             }}
           />
           <label htmlFor="json-upload" className="cursor-pointer flex flex-col items-center justify-center w-full h-full">
             <FileText size={48} className="text-gray-400 dark:text-zinc-500 mb-4" />
             <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
               {jsonFile ? jsonFile.name : 'Click to select a JSON file'}
             </p>
           </label>
         </div>
       </CardContent>
     </Card>

     <div className="flex justify-end pt-4">
       <Button
         onClick={handleJsonUpload}
         disabled={!subjectId || !jsonFile || uploadingJson}
         className="w-full sm:w-auto min-w-[200px]"
       >
         {uploadingJson ? (
           <div className="flex items-center gap-2">
             <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
             Uploading...
           </div>
         ) : (
           <div className="flex items-center gap-2">
             <Upload size={18} />
             Upload JSON & Create Quiz
           </div>
         )}
       </Button>
     </div>
   </>
 ) : null}

 </div>
 );
}
