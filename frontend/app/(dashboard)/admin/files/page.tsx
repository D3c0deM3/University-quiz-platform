'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { materialsApi } from '@/lib/api';
import type { StoredFileEntry } from '@/lib/types';
import { useDebounce } from '@/lib/useDebounce';
import { useTranslation } from '@/lib/i18n';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/empty-state';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Download, Files, Search, Trash2 } from 'lucide-react';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function AdminFilesPage() {
  const { t } = useTranslation();
  const [files, setFiles] = useState<StoredFileEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [deletingPath, setDeletingPath] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 350);

  const load = useCallback(async (nextPage = 1) => {
    setLoading(true);
    try {
      const { data } = await materialsApi.listStoredFiles({
        page: nextPage,
        limit: 20,
        search: debouncedSearch || undefined,
      });
      setFiles(data.data || []);
      setTotal(data.meta?.total || 0);
      setPage(nextPage);
    } catch {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, t]);

  useEffect(() => {
    void load(1);
  }, [load]);

  const handleDownload = async (file: StoredFileEntry) => {
    setDownloadingPath(file.relativePath);
    try {
      const response = await materialsApi.downloadStoredFile(file.relativePath);
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const disposition = response.headers['content-disposition'] as string | undefined;
      const match = disposition?.match(/filename=\"?([^\"]+)\"?/i);
      const fileName = match?.[1] ? decodeURIComponent(match[1]) : file.name;

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error(t('adminFiles.failedDownload'));
    } finally {
      setDownloadingPath(null);
    }
  };

  const handleDelete = async (file: StoredFileEntry) => {
    if (!confirm(t('adminFiles.confirmDelete'))) return;

    setDeletingPath(file.relativePath);
    try {
      await materialsApi.deleteStoredFile(file.relativePath);
      toast.success(t('adminFiles.deleted'));
      await load(page);
    } catch {
      toast.error(t('adminFiles.failedDelete'));
    } finally {
      setDeletingPath(null);
    }
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / 20)), [total]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">{t('adminFiles.title')}</h1>
        <p className="text-gray-500 dark:text-zinc-400">{t('adminFiles.subtitle')}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500" size={18} />
          <Input
            placeholder={t('adminFiles.searchPlaceholder')}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span className="text-sm text-gray-500 dark:text-zinc-400">{t('adminFiles.total', { count: total })}</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : files.length === 0 ? (
        <EmptyState
          icon={<Files size={48} />}
          title={t('adminFiles.noFiles')}
          description={t('adminFiles.subtitle')}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 dark:divide-zinc-800">
              {files.map((file) => (
                <div key={file.relativePath} className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-zinc-100 truncate">{file.name}</p>
                    <p className="text-sm text-gray-500 dark:text-zinc-400 truncate">{file.relativePath}</p>
                    <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1">
                      {formatSize(file.size)} • {formatDate(file.modifiedAt)}
                    </p>
                  </div>

                  <div className="hidden md:block text-sm text-gray-500 dark:text-zinc-400 max-w-xs truncate">
                    {file.material ? file.material.originalName : t('adminFiles.orphan')}
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={file.material ? 'success' : 'warning'}>
                      {file.material ? t('adminFiles.linked') : t('adminFiles.orphan')}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownload(file)}
                      loading={downloadingPath === file.relativePath}
                    >
                      <Download size={14} />
                      {t('adminFiles.download')}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(file)}
                      loading={deletingPath === file.relativePath}
                    >
                      <Trash2 size={14} />
                      {t('adminFiles.delete')}
                    </Button>
                  </div>
                </div>
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
