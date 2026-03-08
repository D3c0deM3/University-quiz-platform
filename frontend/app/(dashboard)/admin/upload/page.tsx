'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { materialsApi, subjectsApi } from '@/lib/api';
import type { Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, FileText, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function UploadPage() {
  const router = useRouter();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    subjectsApi.list(1, 100).then((res) => {
      const data = res.data.data || res.data || [];
      setSubjects(data);
    });
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const handleUpload = async () => {
    if (!file || !subjectId) {
      toast.error('Please select a file and subject');
      return;
    }
    setUploading(true);
    try {
      await materialsApi.upload(file, subjectId);
      toast.success('Material uploaded! Processing will begin shortly.');
      router.push('/admin/materials');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Material</h1>
        <p className="text-gray-500">Upload a file to be processed and added to the system</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Subject</CardTitle>
          <CardDescription>Choose which subject this material belongs to</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            <option value="">Select a subject…</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.code ? `(${s.code})` : ''}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File</CardTitle>
          <CardDescription>
            Supported formats: PDF, DOCX, PPTX, PNG, JPG (max 50MB)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={cn(
                'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer',
                dragOver
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400',
              )}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload size={40} className="text-gray-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">
                Drop your file here, or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-1">PDF, DOCX, PPTX, PNG, JPG</p>
              <input
                id="file-input"
                type="file"
                className="hidden"
                accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFile(f);
                }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-blue-100">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{file.name}</p>
                <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                onClick={() => setFile(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleUpload}
        loading={uploading}
        disabled={!file || !subjectId}
        className="w-full"
        size="lg"
      >
        <Upload size={18} /> Upload & Process
      </Button>
    </div>
  );
}
