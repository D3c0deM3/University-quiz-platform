'use client';

import { useState } from 'react';
import { materialsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { Quiz, QuizQuestion, QuizOption } from '@/lib/types';
import {
 Plus,
 Trash2,
 Save,
 X,
 GripVertical,
 CheckCircle2,
 CircleDot,
 ChevronDown,
 ChevronRight,
 HelpCircle,
 Pencil,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestionEditorProps {
 quiz: Quiz;
 onRefresh: () => void;
}

interface EditingQuestion {
 id?: string;
 questionText: string;
 questionType: string;
 explanation: string;
 orderIndex: number;
 options: EditingOption[];
}

interface EditingOption {
 id?: string;
 optionText: string;
 isCorrect: boolean;
 orderIndex: number;
}

const emptyQuestion: EditingQuestion = {
 questionText: '',
 questionType: 'MCQ',
 explanation: '',
 orderIndex: 0,
 options: [
 { optionText: '', isCorrect: true, orderIndex: 0 },
 { optionText: '', isCorrect: false, orderIndex: 1 },
 { optionText: '', isCorrect: false, orderIndex: 2 },
 { optionText: '', isCorrect: false, orderIndex: 3 },
 ],
};

export function QuizQuestionEditor({ quiz, onRefresh }: QuizQuestionEditorProps) {
 const [expandedId, setExpandedId] = useState<string | null>(null);
 const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null);
 const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
 const [showAddForm, setShowAddForm] = useState(false);
 const [saving, setSaving] = useState(false);
 const [deletingId, setDeletingId] = useState<string | null>(null);

 const questions = quiz.questions ?? [];

 const startEdit = (q: QuizQuestion) => {
 setEditingQuestionId(q.id);
 setEditingQuestion({
 id: q.id,
 questionText: q.questionText,
 questionType: q.questionType,
 explanation: q.explanation ?? '',
 orderIndex: q.orderIndex,
 options: q.options.map((o) => ({
 id: o.id,
 optionText: o.optionText,
 isCorrect: o.isCorrect ?? false,
 orderIndex: o.orderIndex,
 })),
 });
 setShowAddForm(false);
 setExpandedId(q.id);
 };

 const startAdd = () => {
 setShowAddForm(true);
 setEditingQuestionId(null);
 setEditingQuestion({
 ...emptyQuestion,
 orderIndex: questions.length,
 });
 };

 const cancelEdit = () => {
 setEditingQuestion(null);
 setEditingQuestionId(null);
 setShowAddForm(false);
 };

 const setCorrectOption = (idx: number) => {
 if (!editingQuestion) return;
 setEditingQuestion({
 ...editingQuestion,
 options: editingQuestion.options.map((o, i) => ({
 ...o,
 isCorrect: i === idx,
 })),
 });
 };

 const updateOption = (idx: number, text: string) => {
 if (!editingQuestion) return;
 const opts = [...editingQuestion.options];
 opts[idx] = { ...opts[idx], optionText: text };
 setEditingQuestion({ ...editingQuestion, options: opts });
 };

 const addOption = () => {
 if (!editingQuestion) return;
 setEditingQuestion({
 ...editingQuestion,
 options: [
 ...editingQuestion.options,
 {
 optionText: '',
 isCorrect: false,
 orderIndex: editingQuestion.options.length,
 },
 ],
 });
 };

 const removeOption = (idx: number) => {
 if (!editingQuestion || editingQuestion.options.length <= 2) {
 toast.error('At least 2 options are required');
 return;
 }
 const opts = editingQuestion.options.filter((_, i) => i !== idx);
 // If we removed the correct one, make first one correct
 if (!opts.some((o) => o.isCorrect)) {
 opts[0].isCorrect = true;
 }
 setEditingQuestion({
 ...editingQuestion,
 options: opts.map((o, i) => ({ ...o, orderIndex: i })),
 });
 };

 const handleQuestionTypeChange = (type: string) => {
 if (!editingQuestion) return;
 if (type === 'TRUE_FALSE') {
 setEditingQuestion({
 ...editingQuestion,
 questionType: type,
 options: [
 { optionText: 'True', isCorrect: true, orderIndex: 0 },
 { optionText: 'False', isCorrect: false, orderIndex: 1 },
 ],
 });
 } else {
 setEditingQuestion({ ...editingQuestion, questionType: type });
 }
 };

 const handleSave = async () => {
 if (!editingQuestion) return;
 if (!editingQuestion.questionText.trim()) {
 toast.error('Question text is required');
 return;
 }
 if (
 editingQuestion.questionType !== 'SHORT_ANSWER' &&
 editingQuestion.options.some((o) => !o.optionText.trim())
 ) {
 toast.error('All options must have text');
 return;
 }

 setSaving(true);
 try {
 const payload = {
 questionText: editingQuestion.questionText.trim(),
 questionType: editingQuestion.questionType,
 explanation: editingQuestion.explanation.trim() || null,
 orderIndex: editingQuestion.orderIndex,
 options: editingQuestion.options.map((o, i) => ({
 optionText: o.optionText.trim(),
 isCorrect: o.isCorrect,
 orderIndex: i,
 })),
 };

 if (editingQuestionId) {
 await materialsApi.updateQuestion(editingQuestionId, payload);
 toast.success('Question updated');
 } else {
 await materialsApi.createQuestion({
 ...payload,
 quizId: quiz.id,
 });
 toast.success('Question created');
 }
 cancelEdit();
 onRefresh();
 } catch (err: any) {
 toast.error(err.response?.data?.message || 'Failed to save question');
 } finally {
 setSaving(false);
 }
 };

 const handleDelete = async (questionId: string) => {
 if (!confirm('Are you sure you want to delete this question?')) return;
 setDeletingId(questionId);
 try {
 await materialsApi.deleteQuestion(questionId);
 toast.success('Question deleted');
 onRefresh();
 } catch {
 toast.error('Failed to delete question');
 } finally {
 setDeletingId(null);
 }
 };

 const typeLabel = (type: string) => {
 const map: Record<string, string> = {
 MCQ: 'Multiple Choice',
 TRUE_FALSE: 'True/False',
 SHORT_ANSWER: 'Short Answer',
 };
 return map[type] ?? type;
 };

 const typeVariant = (type: string): 'default' | 'success' | 'warning' => {
 const map: Record<string, 'default' | 'success' | 'warning'> = {
 MCQ: 'default',
 TRUE_FALSE: 'success',
 SHORT_ANSWER: 'warning',
 };
 return map[type] ?? 'default';
 };

 return (
 <div className="space-y-4">
 <div className="flex items-center justify-between">
 <h3 className="font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
 <HelpCircle size={18} className="text-blue-500" />
 Questions ({questions.length})
 </h3>
 <Button onClick={startAdd} size="sm" disabled={showAddForm}>
 <Plus size={14} />
 Add Question
 </Button>
 </div>

 {/* Add New Question Form */}
 {showAddForm && editingQuestion && (
 <Card className="border-green-200 bg-green-50/20">
 <CardHeader className="pb-3">
 <CardTitle className="text-base flex items-center gap-2">
 <Plus size={16} className="text-green-600 dark:text-green-400" />
 New Question
 </CardTitle>
 </CardHeader>
 <CardContent>
 <QuestionForm
 question={editingQuestion}
 onChange={setEditingQuestion}
 onTypeChange={handleQuestionTypeChange}
 onSetCorrect={setCorrectOption}
 onUpdateOption={updateOption}
 onAddOption={addOption}
 onRemoveOption={removeOption}
 onSave={handleSave}
 onCancel={cancelEdit}
 saving={saving}
 />
 </CardContent>
 </Card>
 )}

 {/* Questions List */}
 {questions.length === 0 && !showAddForm ? (
 <div className="text-center py-10 text-gray-400 dark:text-slate-500">
 <HelpCircle size={40} className="mx-auto mb-3 opacity-50" />
 <p className="text-sm">No questions yet. Add your first question.</p>
 </div>
 ) : (
 <div className="space-y-2">
 {questions.map((q, idx) => (
 <div
 key={q.id}
 className={cn(
 'border rounded-xl transition-all',
 expandedId === q.id ? 'border-blue-200 dark:border-blue-800 bg-blue-50/10' : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800',
 )}
 >
 {/* Question Header */}
 <div
 className="flex items-center gap-3 p-4 cursor-pointer"
 onClick={() => {
 if (editingQuestionId !== q.id) {
 setExpandedId(expandedId === q.id ? null : q.id);
 }
 }}
 >
 <div className="text-gray-300 shrink-0">
 <GripVertical size={16} />
 </div>
 <span className="text-sm font-bold text-gray-400 dark:text-slate-500 shrink-0 w-7">
 {idx + 1}.
 </span>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-medium text-gray-900 dark:text-slate-100 truncate">
 {q.questionText}
 </p>
 </div>
 <Badge variant={typeVariant(q.questionType)} className="shrink-0">
 {typeLabel(q.questionType)}
 </Badge>
 <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0">
 {q.options.length} options
 </span>
 <div className="flex items-center gap-1 shrink-0">
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8"
 onClick={(e) => {
 e.stopPropagation();
 startEdit(q);
 }}
 title="Edit"
 >
 <Pencil size={14} className="text-blue-500" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8"
 onClick={(e) => {
 e.stopPropagation();
 handleDelete(q.id);
 }}
 loading={deletingId === q.id}
 title="Delete"
 >
 <Trash2 size={14} className="text-red-500" />
 </Button>
 {expandedId === q.id ? (
 <ChevronDown size={16} className="text-gray-400 dark:text-slate-500" />
 ) : (
 <ChevronRight size={16} className="text-gray-400 dark:text-slate-500" />
 )}
 </div>
 </div>

 {/* Expanded Content */}
 {expandedId === q.id && (
 <div className="px-4 pb-4 border-t border-gray-100 dark:border-slate-700">
 {editingQuestionId === q.id && editingQuestion ? (
 /* Edit Mode */
 <div className="pt-4">
 <QuestionForm
 question={editingQuestion}
 onChange={setEditingQuestion}
 onTypeChange={handleQuestionTypeChange}
 onSetCorrect={setCorrectOption}
 onUpdateOption={updateOption}
 onAddOption={addOption}
 onRemoveOption={removeOption}
 onSave={handleSave}
 onCancel={cancelEdit}
 saving={saving}
 />
 </div>
 ) : (
 /* View Mode */
 <div className="pt-4 space-y-3">
 {q.explanation && (
 <div className="text-sm">
 <span className="font-medium text-gray-600 dark:text-slate-400">Explanation: </span>
 <span className="text-gray-500 dark:text-slate-400">{q.explanation}</span>
 </div>
 )}
 <div className="space-y-2">
 {q.options.map((opt, oi) => (
 <div
 key={opt.id}
 className={cn(
 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm',
 opt.isCorrect
 ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-800'
 : 'bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-slate-400',
 )}
 >
 {opt.isCorrect ? (
 <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 shrink-0" />
 ) : (
 <CircleDot size={16} className="text-gray-300 shrink-0" />
 )}
 <span className="font-medium shrink-0">
 {String.fromCharCode(65 + oi)}.
 </span>
 <span>{opt.optionText}</span>
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 );
}

/* ─── Question Form (reusable for create and edit) ────────────── */

interface QuestionFormProps {
 question: EditingQuestion;
 onChange: (q: EditingQuestion) => void;
 onTypeChange: (type: string) => void;
 onSetCorrect: (idx: number) => void;
 onUpdateOption: (idx: number, text: string) => void;
 onAddOption: () => void;
 onRemoveOption: (idx: number) => void;
 onSave: () => void;
 onCancel: () => void;
 saving: boolean;
}

function QuestionForm({
 question,
 onChange,
 onTypeChange,
 onSetCorrect,
 onUpdateOption,
 onAddOption,
 onRemoveOption,
 onSave,
 onCancel,
 saving,
}: QuestionFormProps) {
 return (
 <div className="space-y-4">
 {/* Question Text + Type */}
 <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
 <div className="md:col-span-3">
 <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
 Question Text <span className="text-red-500">*</span>
 </label>
 <Textarea
 placeholder="Enter question text…"
 value={question.questionText}
 onChange={(e) => onChange({ ...question, questionText: e.target.value })}
 rows={2}
 />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">Type</label>
 <Select
 value={question.questionType}
 onChange={(e) => onTypeChange(e.target.value)}
 >
 <option value="MCQ">Multiple Choice</option>
 <option value="TRUE_FALSE">True/False</option>
 <option value="SHORT_ANSWER">Short Answer</option>
 </Select>
 </div>
 </div>

 {/* Explanation */}
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-1 block">
 Explanation (optional)
 </label>
 <Input
 placeholder="Explain the correct answer…"
 value={question.explanation}
 onChange={(e) => onChange({ ...question, explanation: e.target.value })}
 />
 </div>

 {/* Options */}
 {question.questionType !== 'SHORT_ANSWER' && (
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
 Options
 <span className="font-normal text-gray-400 dark:text-slate-500 ml-2">
 (click the circle to mark correct answer)
 </span>
 </label>
 <div className="space-y-2">
 {question.options.map((opt, idx) => (
 <div key={idx} className="flex items-center gap-2">
 <button
 type="button"
 onClick={() => onSetCorrect(idx)}
 className={cn(
 'shrink-0 rounded-full p-0.5 transition-colors cursor-pointer',
 opt.isCorrect
 ? 'text-green-600 dark:text-green-400'
 : 'text-gray-300 hover:text-gray-500 dark:text-slate-400',
 )}
 title={opt.isCorrect ? 'Correct answer' : 'Mark as correct'}
 >
 {opt.isCorrect ? (
 <CheckCircle2 size={20} />
 ) : (
 <CircleDot size={20} />
 )}
 </button>
 <span className="text-sm font-bold text-gray-400 dark:text-slate-500 shrink-0 w-5">
 {String.fromCharCode(65 + idx)}.
 </span>
 <Input
 placeholder={`Option ${String.fromCharCode(65 + idx)}`}
 value={opt.optionText}
 onChange={(e) => onUpdateOption(idx, e.target.value)}
 className={cn(
 'flex-1',
 opt.isCorrect && 'border-green-300 bg-green-50/50',
 )}
 />
 {question.options.length > 2 && (
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8 shrink-0"
 onClick={() => onRemoveOption(idx)}
 >
 <X size={14} className="text-red-400" />
 </Button>
 )}
 </div>
 ))}
 </div>
 {question.questionType === 'MCQ' && question.options.length < 6 && (
 <Button
 variant="outline"
 size="sm"
 className="mt-2"
 onClick={onAddOption}
 >
 <Plus size={14} />
 Add Option
 </Button>
 )}
 </div>
 )}

 {/* Actions */}
 <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-700">
 <Button onClick={onSave} loading={saving} size="sm">
 <Save size={14} />
 Save Question
 </Button>
 <Button variant="ghost" size="sm" onClick={onCancel}>
 <X size={14} />
 Cancel
 </Button>
 </div>
 </div>
 );
}
