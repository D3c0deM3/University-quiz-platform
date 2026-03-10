'use client';

import { useEffect, useState, useCallback } from 'react';
import { subjectsApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import type { Subject } from '@/lib/types';
import {
 BookOpen,
 Plus,
 Pencil,
 Trash2,
 X,
 Search,
 Save,
} from 'lucide-react';

interface SubjectForm {
 name: string;
 description: string;
 code: string;
}

const emptyForm: SubjectForm = { name: '', description: '', code: '' };

export default function AdminSubjectsPage() {
 const { t } = useTranslation();
 const [subjects, setSubjects] = useState<Subject[]>([]);
 const [loading, setLoading] = useState(true);
 const [search, setSearch] = useState('');
 const [editingId, setEditingId] = useState<string | null>(null);
 const [showCreate, setShowCreate] = useState(false);
 const [form, setForm] = useState<SubjectForm>(emptyForm);
 const [saving, setSaving] = useState(false);
 const [deletingId, setDeletingId] = useState<string | null>(null);

 const load = useCallback(async () => {
 try {
 const res = await subjectsApi.list(1, 200);
 setSubjects(res.data.data ?? res.data ?? []);
 } catch {
 toast.error(t('adminSubjects.noSubjects'));
 } finally {
 setLoading(false);
 }
 }, []);

 useEffect(() => {
 load();
 }, [load]);

 const filteredSubjects = subjects.filter(
 (s) =>
 s.name.toLowerCase().includes(search.toLowerCase()) ||
 s.code?.toLowerCase().includes(search.toLowerCase()) ||
 s.description?.toLowerCase().includes(search.toLowerCase()),
 );

 const startEdit = (subject: Subject) => {
 setEditingId(subject.id);
 setForm({
 name: subject.name,
 description: subject.description ?? '',
 code: subject.code ?? '',
 });
 setShowCreate(false);
 };

 const cancelEdit = () => {
 setEditingId(null);
 setForm(emptyForm);
 setShowCreate(false);
 };

 const handleCreate = async () => {
 if (!form.name.trim()) {
 toast.error(t('adminSubjects.name'));
 return;
 }
 setSaving(true);
 try {
 await subjectsApi.create({
 name: form.name.trim(),
 description: form.description.trim() || undefined,
 code: form.code.trim() || undefined,
 });
 toast.success(t('adminSubjects.createSubject'));
 cancelEdit();
 load();
 } catch (err: any) {
 toast.error(err.response?.data?.message || t('adminSubjects.createSubject'));
 } finally {
 setSaving(false);
 }
 };

 const handleUpdate = async () => {
 if (!editingId || !form.name.trim()) {
 toast.error(t('adminSubjects.name'));
 return;
 }
 setSaving(true);
 try {
 await subjectsApi.update(editingId, {
 name: form.name.trim(),
 description: form.description.trim() || undefined,
 code: form.code.trim() || undefined,
 });
 toast.success(t('adminSubjects.editSubject'));
 cancelEdit();
 load();
 } catch (err: any) {
 toast.error(err.response?.data?.message || t('adminSubjects.editSubject'));
 } finally {
 setSaving(false);
 }
 };

 const handleDelete = async (id: string) => {
 setDeletingId(id);
 try {
 await subjectsApi.delete(id);
 toast.success(t('adminSubjects.deleteSubject'));
 load();
 } catch (err: any) {
 toast.error(err.response?.data?.message || t('adminSubjects.deleteSubject'));
 } finally {
 setDeletingId(null);
 }
 };

 if (loading) {
 return (
 <div className="space-y-6">
 <Skeleton className="h-8 w-48" />
 <Skeleton className="h-10 w-full max-w-md" />
 <div className="space-y-3">
 {[1, 2, 3, 4].map((i) => (
 <Skeleton key={i} className="h-20 w-full rounded-xl" />
 ))}
 </div>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('adminSubjects.title')}</h1>
 <p className="text-gray-500 dark:text-zinc-400 mt-1">{t('adminSubjects.subtitle')}</p>
 </div>
 <Button
 onClick={() => {
 setShowCreate(true);
 setEditingId(null);
 setForm(emptyForm);
 }}
 disabled={showCreate}
 >
 <Plus size={16} />
 {t('adminSubjects.createSubject')}
 </Button>
 </div>

 {/* Search */}
 <div className="relative max-w-md">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
 <Input
 placeholder={t('adminSubjects.searchPlaceholder')}
 className="pl-10"
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 />
 </div>

 {/* Create Form */}
 {showCreate && (
 <Card className="border-blue-200 dark:border-blue-500/20 bg-blue-50/30">
 <CardHeader className="pb-3">
 <CardTitle className="text-base flex items-center gap-2">
 <Plus size={16} className="text-blue-600 dark:text-blue-400" />
 {t('adminSubjects.createSubject')}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
 {t('adminSubjects.name')} <span className="text-red-500">*</span>
 </label>
 <Input
 placeholder={t('adminSubjects.namePlaceholder')}
 value={form.name}
 onChange={(e) => setForm({ ...form, name: e.target.value })}
 />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 block">{t('adminSubjects.code')}</label>
 <Input
 placeholder={t('adminSubjects.codePlaceholder')}
 value={form.code}
 onChange={(e) => setForm({ ...form, code: e.target.value })}
 />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 block">{t('adminSubjects.description')}</label>
 <Input
 placeholder={t('adminSubjects.descPlaceholder')}
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 />
 </div>
 </div>
 <div className="flex items-center gap-2 mt-4">
 <Button onClick={handleCreate} loading={saving} size="sm">
 <Save size={14} />
 {t('common.save')}
 </Button>
 <Button variant="ghost" size="sm" onClick={cancelEdit}>
 <X size={14} />
 {t('common.cancel')}
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {/* Subject List */}
 {filteredSubjects.length === 0 ? (
 <EmptyState
 icon={<BookOpen size={48} />}
 title={t('adminSubjects.noSubjects')}
 description={
 search
 ? t('subjects.noSubjectsSearch')
 : t('adminSubjects.noSubjects')
 }
 action={
 !search ? (
 <Button onClick={() => { setShowCreate(true); setForm(emptyForm); }}>
 <Plus size={16} />
 {t('adminSubjects.createSubject')}
 </Button>
 ) : undefined
 }
 />
 ) : (
 <div className="space-y-3">
 {filteredSubjects.map((subject) => (
 <Card key={subject.id} className="hover:shadow-sm transition-shadow">
 <CardContent className="p-4">
 {editingId === subject.id ? (
 /* Edit Mode */
 <div>
 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 block">{t('adminSubjects.name')}</label>
 <Input
 value={form.name}
 onChange={(e) => setForm({ ...form, name: e.target.value })}
 />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 block">{t('adminSubjects.code')}</label>
 <Input
 value={form.code}
 onChange={(e) => setForm({ ...form, code: e.target.value })}
 />
 </div>
 <div>
 <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-1 block">
 {t('adminSubjects.description')}
 </label>
 <Input
 value={form.description}
 onChange={(e) => setForm({ ...form, description: e.target.value })}
 />
 </div>
 </div>
 <div className="flex items-center gap-2 mt-3">
 <Button onClick={handleUpdate} loading={saving} size="sm">
 <Save size={14} />
 {t('common.save')}
 </Button>
 <Button variant="ghost" size="sm" onClick={cancelEdit}>
 <X size={14} />
 {t('common.cancel')}
 </Button>
 </div>
 </div>
 ) : (
 /* View Mode */
 <div className="flex items-center gap-4">
 <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 dark:bg-cyan-500/8 text-cyan-600 dark:text-cyan-400 shrink-0">
 <BookOpen size={20} />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center gap-2">
 <h3 className="font-semibold text-gray-900 dark:text-zinc-100">{subject.name}</h3>
 {subject.code && (
 <span className="text-xs bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-zinc-400 px-2 py-0.5 rounded-full">
 {subject.code}
 </span>
 )}
 </div>
 {subject.description && (
 <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">{subject.description}</p>
 )}
 <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
 {t('materials.created')} {formatDate(subject.createdAt)}
 </p>
 </div>
 <div className="flex items-center gap-1 shrink-0">
 <Button
 variant="ghost"
 size="icon"
 onClick={() => startEdit(subject)}
 title={t('adminSubjects.editSubject')}
 >
 <Pencil size={16} className="text-gray-500 dark:text-zinc-400" />
 </Button>
 <Button
 variant="ghost"
 size="icon"
 onClick={() => handleDelete(subject.id)}
 loading={deletingId === subject.id}
 title={t('adminSubjects.deleteSubject')}
 >
 <Trash2 size={16} className="text-red-500" />
 </Button>
 </div>
 </div>
 )}
 </CardContent>
 </Card>
 ))}
 </div>
 )}

 {/* Summary */}
 <p className="text-sm text-gray-400 dark:text-zinc-500 text-center">
 {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}
 {search ? ' matching your search' : ' total'}
 </p>
 </div>
 );
}
