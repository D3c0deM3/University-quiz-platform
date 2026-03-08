'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { subjectsApi, materialsApi, quizzesApi } from '@/lib/api';
import type { Subject, Material, Quiz } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { BookOpen, FileText, ClipboardList, ArrowLeft } from 'lucide-react';

export default function SubjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [subject, setSubject] = useState<Subject | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [subjectRes, materialsRes, quizzesRes] = await Promise.all([
          subjectsApi.get(id),
          materialsApi.list({ subjectId: id, status: 'PUBLISHED', limit: 50 }),
          quizzesApi.listBySubject(id, 1, 50),
        ]);
        setSubject(subjectRes.data);
        setMaterials(materialsRes.data.data || []);
        setQuizzes(quizzesRes.data.data || []);
      } catch {
        // handle error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!subject) {
    return (
      <EmptyState
        icon={<BookOpen size={48} />}
        title="Subject not found"
        action={
          <Link href="/subjects">
            <Button variant="outline">Back to Subjects</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/subjects"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
        >
          <ArrowLeft size={14} /> Back to Subjects
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{subject.name}</h1>
          {subject.code && <Badge variant="outline">{subject.code}</Badge>}
        </div>
        {subject.description && (
          <p className="mt-1 text-gray-500">{subject.description}</p>
        )}
      </div>

      {/* Materials */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText size={18} />
            Materials ({materials.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {materials.length === 0 ? (
            <EmptyState
              title="No published materials"
              description="Materials for this subject haven't been published yet"
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {materials.map((m) => (
                <Link
                  key={m.id}
                  href={`/materials/${m.id}`}
                  className="flex items-center gap-3 rounded-lg border border-gray-100 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100">
                    <FileText size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">
                      {m.metadata?.title || m.originalName}
                    </p>
                    {m.metadata?.summary && (
                      <p className="text-sm text-gray-500 line-clamp-1">{m.metadata.summary}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary">{m.fileType.toUpperCase()}</Badge>
                    {m.metadata?.difficultyLevel && (
                      <Badge
                        variant={
                          m.metadata.difficultyLevel === 'BEGINNER'
                            ? 'success'
                            : m.metadata.difficultyLevel === 'INTERMEDIATE'
                            ? 'warning'
                            : 'destructive'
                        }
                      >
                        {m.metadata.difficultyLevel}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quizzes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList size={18} />
            Quizzes ({quizzes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {quizzes.length === 0 ? (
            <EmptyState
              title="No quizzes available"
              description="Quizzes will appear here once published"
              className="py-8"
            />
          ) : (
            <div className="space-y-2">
              {quizzes.map((q) => (
                <div
                  key={q.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{q.title}</p>
                    {q.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{q.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {q._count?.questions ?? 0} questions
                    </p>
                  </div>
                  <Link href={`/quizzes/${q.id}`}>
                    <Button size="sm">Take Quiz</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
