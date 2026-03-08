'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { materialsApi } from '@/lib/api';
import type { Material, MaterialMetadata } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import {
  FileText,
  ArrowLeft,
  Download,
  BookOpen,
  Tag,
  Hash,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function MaterialDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [material, setMaterial] = useState<Material | null>(null);
  const [metadata, setMetadata] = useState<MaterialMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    async function load() {
      try {
        const [matRes, metaRes] = await Promise.all([
          materialsApi.get(id),
          materialsApi.getMetadata(id).catch(() => null),
        ]);
        setMaterial(matRes.data);
        setMetadata(metaRes?.data || null);
      } catch {
        // handle
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (!material) {
    return (
      <EmptyState
        icon={<FileText size={48} />}
        title="Material not found"
        action={
          <Link href="/search">
            <Button variant="outline">Back to Search</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/search"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft size={14} /> Back to Search
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 shrink-0">
          <FileText size={28} className="text-blue-600" />
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {metadata?.title || material.originalName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{material.fileType.toUpperCase()}</Badge>
            <Badge
              variant={
                material.status === 'PUBLISHED'
                  ? 'success'
                  : material.status === 'FAILED'
                  ? 'destructive'
                  : 'warning'
              }
            >
              {material.status}
            </Badge>
            {metadata?.difficultyLevel && (
              <Badge
                variant={
                  metadata.difficultyLevel === 'BEGINNER'
                    ? 'success'
                    : metadata.difficultyLevel === 'INTERMEDIATE'
                    ? 'warning'
                    : 'destructive'
                }
              >
                {metadata.difficultyLevel}
              </Badge>
            )}
          </div>
        </div>
        <a
          href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/materials/${material.id}/download`}
          target="_blank"
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 h-10 px-4 py-2 shrink-0"
        >
          <Download size={16} />
          Download
        </a>
      </div>

      {/* Summary */}
      {metadata?.summary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen size={18} />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {metadata.summary}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Details Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* File Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText size={16} />
              File Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Original name</span>
              <span className="font-medium text-gray-900">{material.originalName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className="font-medium text-gray-900">{material.fileType.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Size</span>
              <span className="font-medium text-gray-900">
                {(material.fileSize / 1024).toFixed(1)} KB
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Subject</span>
              <span className="font-medium text-gray-900">
                {material.subject?.name || material.subjectId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Uploaded</span>
              <span className="font-medium text-gray-900">{formatDate(material.createdAt)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 size={16} />
              AI-Generated Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {metadata?.contentType && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-gray-500">Content Type</p>
                <p className="text-sm text-gray-900">{metadata.contentType}</p>
              </div>
            )}
            {metadata?.keywords && metadata.keywords.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Hash size={12} /> Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.keywords.map((kw) => (
                    <Badge key={kw} variant="outline">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
            {metadata?.topics && metadata.topics.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <BookOpen size={12} /> Topics
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.topics.map((t) => (
                    <Badge key={t} variant="secondary">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {metadata?.tags && metadata.tags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Tag size={12} /> Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {metadata.tags.map((t) => (
                    <Badge key={t} variant="default">{t}</Badge>
                  ))}
                </div>
              </div>
            )}
            {!metadata && (
              <p className="text-sm text-gray-400">No metadata generated yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Created date */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Calendar size={14} />
        Created {formatDate(material.createdAt)}
      </div>
    </div>
  );
}
