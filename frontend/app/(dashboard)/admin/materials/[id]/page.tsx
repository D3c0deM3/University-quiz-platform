'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { materialsApi } from '@/lib/api';
import type { Material, MaterialMetadata, Quiz } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { QuizQuestionEditor } from '@/components/quiz-question-editor';
import { toast } from 'sonner';
import {
  ArrowLeft,
  FileText,
  Save,
  CheckCircle,
  XCircle,
  Globe,
  GlobeIcon,
  RotateCcw,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function MaterialReviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [material, setMaterial] = useState<Material | null>(null);
  const [metadata, setMetadata] = useState<MaterialMetadata | null>(null);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);

  // Editable metadata fields
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [keywords, setKeywords] = useState('');
  const [topics, setTopics] = useState('');
  const [tags, setTags] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [saving, setSaving] = useState(false);

  const loadQuizzes = useCallback(async () => {
    if (!id) return;
    try {
      const quizRes = await materialsApi.getQuizzes(id);
      setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);
    } catch {
      // ignore
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [matRes, metaRes, quizRes] = await Promise.all([
          materialsApi.get(id),
          materialsApi.getMetadata(id).catch(() => null),
          materialsApi.getQuizzes(id).catch(() => ({ data: [] })),
        ]);
        setMaterial(matRes.data);
        const meta = metaRes?.data || null;
        setMetadata(meta);
        setQuizzes(Array.isArray(quizRes.data) ? quizRes.data : []);

        if (meta) {
          setTitle(meta.title || '');
          setSummary(meta.summary || '');
          setKeywords((meta.keywords || []).join(', '));
          setTopics((meta.topics || []).join(', '));
          setTags((meta.tags || []).join(', '));
          setDifficulty(meta.difficultyLevel || '');
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const saveMetadata = async () => {
    if (!id) return;
    setSaving(true);
    try {
      await materialsApi.updateMetadata(id, {
        title,
        summary,
        keywords: keywords.split(',').map((s) => s.trim()).filter(Boolean),
        topics: topics.split(',').map((s) => s.trim()).filter(Boolean),
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        difficultyLevel: difficulty || undefined,
      });
      toast.success('Metadata saved');
    } catch {
      toast.error('Failed to save metadata');
    } finally {
      setSaving(false);
    }
  };

  const handleReview = async (action: 'approve' | 'reject') => {
    if (!id) return;
    try {
      await materialsApi.review(id, action);
      toast.success(action === 'approve' ? 'Material approved' : 'Material rejected');
      // Reload
      const { data } = await materialsApi.get(id);
      setMaterial(data);
    } catch {
      toast.error(`Failed to ${action}`);
    }
  };

  const handlePublish = async (publish: boolean) => {
    if (!id) return;
    try {
      await materialsApi.publish(id, publish);
      toast.success(publish ? 'Material published' : 'Material unpublished');
      const { data } = await materialsApi.get(id);
      setMaterial(data);
    } catch {
      toast.error('Failed to update publish status');
    }
  };

  const handleReprocess = async () => {
    if (!id) return;
    try {
      await materialsApi.reprocess(id);
      toast.success('Material queued for reprocessing');
      const { data } = await materialsApi.get(id);
      setMaterial(data);
    } catch {
      toast.error('Failed to reprocess');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Material not found</p>
        <Link href="/admin/materials"><Button variant="outline" className="mt-4">Back</Button></Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/admin/materials"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Back to Materials
      </Link>

      {/* Header with actions */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {metadata?.title || material.originalName}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            <Badge
              variant={
                material.status === 'PUBLISHED' ? 'success' :
                material.status === 'FAILED' ? 'destructive' : 'warning'
              }
            >
              {material.status}
            </Badge>
            <span className="text-sm text-gray-500">
              {material.fileType.toUpperCase()} • {(material.fileSize / 1024).toFixed(0)} KB • {formatDate(material.createdAt)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {material.status === 'PROCESSED' && (
            <>
              <Button variant="outline" onClick={() => handleReview('reject')} className="gap-1">
                <XCircle size={16} /> Reject
              </Button>
              <Button onClick={() => handleReview('approve')} className="gap-1">
                <CheckCircle size={16} /> Approve
              </Button>
            </>
          )}
          {material.status === 'REVIEWED' && (
            <Button onClick={() => handlePublish(true)} className="gap-1">
              <Globe size={16} /> Publish
            </Button>
          )}
          {material.status === 'PUBLISHED' && (
            <Button variant="outline" onClick={() => handlePublish(false)} className="gap-1">
              <GlobeIcon size={16} /> Unpublish
            </Button>
          )}
          {(material.status === 'FAILED' || material.status === 'PROCESSED') && (
            <Button variant="secondary" onClick={handleReprocess} className="gap-1">
              <RotateCcw size={16} /> Reprocess
            </Button>
          )}
        </div>
      </div>

      {/* Metadata Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} /> Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Title</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Summary</label>
            <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={4} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Keywords (comma-separated)</label>
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="keyword1, keyword2" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Topics (comma-separated)</label>
              <Input value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="topic1, topic2" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tags (comma-separated)</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tag1, tag2" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Difficulty</label>
              <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="">Not set</option>
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </Select>
            </div>
          </div>
          <Button onClick={saveMetadata} loading={saving} className="gap-2">
            <Save size={16} /> Save Metadata
          </Button>
        </CardContent>
      </Card>

      {/* Quizzes with Question Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Generated Quizzes ({quizzes.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <p className="text-sm text-gray-400">No quizzes generated for this material</p>
          ) : (
            <div className="space-y-4">
              {quizzes.map((q) => (
                <div key={q.id} className="rounded-xl border border-gray-200 overflow-hidden">
                  {/* Quiz Header */}
                  <button
                    onClick={() =>
                      setExpandedQuiz(expandedQuiz === q.id ? null : q.id)
                    }
                    className="flex items-center justify-between w-full p-4 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{q.title}</p>
                      <p className="text-sm text-gray-500">
                        {q._count?.questions || q.questions?.length || 0} questions
                        {q.isPublished ? ' • Published' : ' • Draft'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={q.isPublished ? 'success' : 'secondary'}>
                        {q.isPublished ? 'Published' : 'Draft'}
                      </Badge>
                      {expandedQuiz === q.id ? (
                        <ChevronDown size={18} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Quiz Question Editor */}
                  {expandedQuiz === q.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50/50">
                      <QuizQuestionEditor
                        quiz={q}
                        onRefresh={loadQuizzes}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
