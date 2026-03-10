'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { materialsApi } from '@/lib/api';
import type { Material, MaterialStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { FileText, Eye, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

const STATUS_KEYS: { value: string; labelKey: string }[] = [
 { value: '', labelKey: 'adminMaterials.allStatuses' },
 { value: 'PENDING', labelKey: 'common.pending' },
 { value: 'PROCESSING', labelKey: 'common.processing' },
 { value: 'PROCESSED', labelKey: 'common.processed' },
 { value: 'REVIEWED', labelKey: 'common.reviewed' },
 { value: 'PUBLISHED', labelKey: 'common.published' },
 { value: 'FAILED', labelKey: 'common.failed' },
];

const statusVariant = (status: MaterialStatus) => {
 switch (status) {
 case 'PUBLISHED': return 'success' as const;
 case 'REVIEWED': return 'default' as const;
 case 'PROCESSED': return 'warning' as const;
 case 'PROCESSING': return 'secondary' as const;
 case 'FAILED': return 'destructive' as const;
 default: return 'outline' as const;
 }
};

const STATUS_LABEL_MAP: Record<string, string> = {
 PENDING: 'common.pending',
 PROCESSING: 'common.processing',
 PROCESSED: 'common.processed',
 REVIEWED: 'common.reviewed',
 PUBLISHED: 'common.published',
 FAILED: 'common.failed',
};

export default function AdminMaterialsPage() {
 const { t } = useTranslation();
 const [materials, setMaterials] = useState<Material[]>([]);
 const [status, setStatus] = useState('');
 const [page, setPage] = useState(1);
 const [total, setTotal] = useState(0);
 const [loading, setLoading] = useState(true);

 const load = async (p = 1, s = status) => {
 setLoading(true);
 try {
 const params: Record<string, string | number | undefined> = { page: p, limit: 20 };
 if (s) params.status = s;
 const { data } = await materialsApi.list(params as { page?: number; limit?: number; status?: string });
 setMaterials(data.data || []);
 setTotal(data.meta?.total || 0);
 setPage(p);
 } finally {
 setLoading(false);
 }
 };

 useEffect(() => {
 load();
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);

 const handleStatusChange = (val: string) => {
 setStatus(val);
 load(1, val);
 };

 const handleDelete = async (id: string, e: React.MouseEvent) => {
 e.preventDefault();
 e.stopPropagation();
 if (!confirm(t('adminMaterials.confirmDelete'))) return;
 try {
 await materialsApi.delete(id);
 toast.success(t('adminMaterials.materialDeleted'));
 load(page);
 } catch (err: any) {
 toast.error(err.response?.data?.message || t('adminMaterials.failedDelete'));
 }
 };

 const totalPages = Math.ceil(total / 20);

 return (
 <div className="space-y-6">
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('adminMaterials.title')}</h1>
 <p className="text-gray-500 dark:text-zinc-400">{t('adminMaterials.subtitle')}</p>
 </div>
 <Link href="/admin/upload">
 <Button>{t('adminMaterials.uploadMaterial')}</Button>
 </Link>
 </div>

 <div className="flex items-center gap-3">
 <Select
 value={status}
 onChange={(e) => handleStatusChange(e.target.value)}
 className="w-48"
 >
 {STATUS_KEYS.map((o) => (
 <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
 ))}
 </Select>
 <span className="text-sm text-gray-500 dark:text-zinc-400">{t('adminMaterials.totalMaterials', { count: total })}</span>
 </div>

 {loading ? (
 <div className="space-y-3">
 {[1, 2, 3, 4].map((i) => (
 <Skeleton key={i} className="h-20 w-full rounded-xl" />
 ))}
 </div>
 ) : materials.length === 0 ? (
 <EmptyState
 icon={<FileText size={48} />}
 title={t('adminMaterials.noMaterials')}
 description={status ? t('adminMaterials.noMaterialsWithStatus') : t('adminMaterials.getStarted')}
 action={
 <Link href="/admin/upload">
 <Button>{t('adminMaterials.uploadMaterial')}</Button>
 </Link>
 }
 />
 ) : (
 <Card>
 <CardContent className="p-0">
 <div className="divide-y divide-gray-100">
 {materials.map((m) => (
 <Link
 key={m.id}
 href={`/admin/materials/${m.id}`}
 className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
 >
 <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 dark:bg-zinc-700 shrink-0">
 <FileText size={18} className="text-gray-500 dark:text-zinc-400" />
 </div>
 <div className="flex-1 min-w-0">
 <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">
 {m.metadata?.title || m.originalName}
 </p>
 <p className="text-sm text-gray-500 dark:text-zinc-400">
 {m.fileType.toUpperCase()} • {(m.fileSize / 1024).toFixed(0)} KB • {formatDate(m.createdAt)}
 </p>
 </div>
 <div className="flex items-center gap-3 shrink-0">
 <Badge variant={statusVariant(m.status)}>{t(STATUS_LABEL_MAP[m.status] || m.status)}</Badge>
 <button
 onClick={(e) => handleDelete(m.id, e)}
 className="p-1.5 rounded-md text-gray-400 dark:text-zinc-500 hover:bg-red-50 dark:bg-red-500/8 hover:text-red-600 dark:text-red-400 transition-colors"
 title={t('adminMaterials.deleteMaterial')}
 >
 <Trash2 size={16} />
 </button>
 <Eye size={16} className="text-gray-400 dark:text-zinc-500" />
 </div>
 </Link>
 ))}
 </div>
 </CardContent>
 </Card>
 )}

 {totalPages > 1 && (
 <div className="flex items-center justify-center gap-2">
 <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load(page - 1)}>
 {t('common.previous')}
 </Button>
 <span className="text-sm text-gray-500 dark:text-zinc-400">{t('common.page')} {page} {t('common.of')} {totalPages}</span>
 <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
 {t('common.next')}
 </Button>
 </div>
 )}
 </div>
 );
}
