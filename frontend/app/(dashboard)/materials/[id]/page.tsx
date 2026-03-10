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
import { useTranslation } from '@/lib/i18n';

export default function MaterialDetailPage() {
 const { id } = useParams<{ id: string }>();
 const { t } = useTranslation();
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
 title={t('materials.notFound')}
 action={
 <Link href="/search">
 <Button variant="outline">{t('materials.backToSearch')}</Button>
 </Link>
 }
 />
 );
 }

 return (
 <div className="space-y-6 max-w-4xl">
 <Link
 href="/search"
 className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
 >
 <ArrowLeft size={14} /> {t('materials.backToSearch')}
 </Link>

 {/* Header */}
 <div className="flex items-start gap-4">
 <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40 shrink-0">
 <FileText size={28} className="text-blue-600 dark:text-blue-400" />
 </div>
 <div className="flex-1">
 <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
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
 {metadata.difficultyLevel === 'BEGINNER' ? t('materials.beginner') : metadata.difficultyLevel === 'INTERMEDIATE' ? t('materials.intermediate') : t('materials.advanced')}
 </Badge>
 )}
 </div>
 </div>
 <a
 href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'}/materials/${material.id}/download`}
 target="_blank"
 className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 h-10 px-4 py-2 shrink-0"
 >
 <Download size={16} />
 {t('materials.download')}
 </a>
 </div>

 {/* Summary */}
 {metadata?.summary && (
 <Card>
 <CardHeader>
 <CardTitle className="flex items-center gap-2">
 <BookOpen size={18} />
 {t('materials.summary')}
 </CardTitle>
 </CardHeader>
 <CardContent>
 <p className="text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
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
 {t('materials.fileInformation')}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-3 text-sm">
 <div className="flex justify-between">
 <span className="text-gray-500 dark:text-slate-400">{t('materials.originalName')}</span>
 <span className="font-medium text-gray-900 dark:text-slate-100">{material.originalName}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500 dark:text-slate-400">{t('common.type')}</span>
 <span className="font-medium text-gray-900 dark:text-slate-100">{material.fileType.toUpperCase()}</span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500 dark:text-slate-400">{t('materials.size')}</span>
 <span className="font-medium text-gray-900 dark:text-slate-100">
 {(material.fileSize / 1024).toFixed(1)} KB
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500 dark:text-slate-400">{t('materials.subject')}</span>
 <span className="font-medium text-gray-900 dark:text-slate-100">
 {material.subject?.name || material.subjectId}
 </span>
 </div>
 <div className="flex justify-between">
 <span className="text-gray-500 dark:text-slate-400">{t('materials.uploaded')}</span>
 <span className="font-medium text-gray-900 dark:text-slate-100">{formatDate(material.createdAt)}</span>
 </div>
 </CardContent>
 </Card>

 {/* Metadata */}
 <Card>
 <CardHeader>
 <CardTitle className="text-base flex items-center gap-2">
 <BarChart3 size={16} />
 {t('materials.aiMetadata')}
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 {metadata?.contentType && (
 <div className="space-y-1">
 <p className="text-xs font-medium text-gray-500 dark:text-slate-400">{t('materials.contentType')}</p>
 <p className="text-sm text-gray-900 dark:text-slate-100">{metadata.contentType}</p>
 </div>
 )}
 {metadata?.keywords && metadata.keywords.length > 0 && (
 <div className="space-y-1.5">
 <p className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
 <Hash size={12} /> {t('materials.keywords')}
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
 <p className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
 <BookOpen size={12} /> {t('materials.topics')}
 </p>
 <div className="flex flex-wrap gap-1.5">
 {metadata.topics.map((topic) => (
 <Badge key={topic} variant="secondary">{topic}</Badge>
 ))}
 </div>
 </div>
 )}
 {metadata?.tags && metadata.tags.length > 0 && (
 <div className="space-y-1.5">
 <p className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
 <Tag size={12} /> {t('materials.tags')}
 </p>
 <div className="flex flex-wrap gap-1.5">
 {metadata.tags.map((tag) => (
 <Badge key={tag} variant="default">{tag}</Badge>
 ))}
 </div>
 </div>
 )}
 {!metadata && (
 <p className="text-sm text-gray-400 dark:text-slate-500">{t('materials.noMetadata')}</p>
 )}
 </CardContent>
 </Card>
 </div>

 {/* Created date */}
 <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-slate-500">
 <Calendar size={14} />
 {t('materials.created')} {formatDate(material.createdAt)}
 </div>
 </div>
 );
}
