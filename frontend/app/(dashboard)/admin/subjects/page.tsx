'use client';

import { useEffect, useState, useCallback } from 'react';
import { subjectsApi } from '@/lib/api';
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
      toast.error('Failed to load subjects');
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
      toast.error('Subject name is required');
      return;
    }
    setSaving(true);
    try {
      await subjectsApi.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        code: form.code.trim() || undefined,
      });
      toast.success('Subject created');
      cancelEdit();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create subject');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !form.name.trim()) {
      toast.error('Subject name is required');
      return;
    }
    setSaving(true);
    try {
      await subjectsApi.update(editingId, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        code: form.code.trim() || undefined,
      });
      toast.success('Subject updated');
      cancelEdit();
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to update subject');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await subjectsApi.delete(id);
      toast.success('Subject deleted');
      load();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to delete subject');
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
          <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
          <p className="text-gray-500 mt-1">Manage subjects and course categories</p>
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
          New Subject
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <Input
          placeholder="Search subjects…"
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Create Form */}
      {showCreate && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus size={16} className="text-blue-600" />
              Create New Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Data Structures"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Code</label>
                <Input
                  placeholder="e.g. CS201"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                <Input
                  placeholder="Brief description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button onClick={handleCreate} loading={saving} size="sm">
                <Save size={14} />
                Create
              </Button>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X size={14} />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject List */}
      {filteredSubjects.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No subjects found"
          description={
            search
              ? 'No subjects match your search. Try a different query.'
              : 'Create your first subject to get started.'
          }
          action={
            !search ? (
              <Button onClick={() => { setShowCreate(true); setForm(emptyForm); }}>
                <Plus size={16} />
                Create Subject
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
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Name</label>
                        <Input
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Code</label>
                        <Input
                          value={form.code}
                          onChange={(e) => setForm({ ...form, code: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">
                          Description
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
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={cancelEdit}>
                        <X size={14} />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 shrink-0">
                      <BookOpen size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{subject.name}</h3>
                        {subject.code && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {subject.code}
                          </span>
                        )}
                      </div>
                      {subject.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{subject.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        Created {formatDate(subject.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(subject)}
                        title="Edit"
                      >
                        <Pencil size={16} className="text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(subject.id)}
                        loading={deletingId === subject.id}
                        title="Delete"
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
      <p className="text-sm text-gray-400 text-center">
        {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}
        {search ? ' matching your search' : ' total'}
      </p>
    </div>
  );
}
