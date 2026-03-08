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
import { FileText, Eye } from 'lucide-react';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'PROCESSED', label: 'Processed' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'FAILED', label: 'Failed' },
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

export default function AdminMaterialsPage() {
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

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          <p className="text-gray-500">Manage uploaded materials</p>
        </div>
        <Link href="/admin/upload">
          <Button>Upload Material</Button>
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={status}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="w-48"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </Select>
        <span className="text-sm text-gray-500">{total} materials</span>
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
          title="No materials"
          description={status ? 'No materials with this status' : 'Upload materials to get started'}
          action={
            <Link href="/admin/upload">
              <Button>Upload Material</Button>
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
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded bg-gray-100 shrink-0">
                    <FileText size={18} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {m.metadata?.title || m.originalName}
                    </p>
                    <p className="text-sm text-gray-500">
                      {m.fileType.toUpperCase()} • {(m.fileSize / 1024).toFixed(0)} KB • {formatDate(m.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge variant={statusVariant(m.status)}>{m.status}</Badge>
                    <Eye size={16} className="text-gray-400" />
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
            Previous
          </Button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => load(page + 1)}>
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
