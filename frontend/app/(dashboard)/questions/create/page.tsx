'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { questionsApi, subjectsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import type { Subject } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { ArrowLeft, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function CreateQuestionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [answerText, setAnswerText] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    subjectsApi.list(1, 100).then((res) => {
      const data = res.data.data || res.data || [];
      setSubjects(data);
      if (data.length > 0 && !subjectId) {
        setSubjectId(data[0].id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim() || !answerText.trim() || !subjectId) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await questionsApi.create(
        { questionText: questionText.trim(), answerText: answerText.trim(), subjectId },
        image || undefined,
      );

      const isAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';
      toast.success(
        isAdmin
          ? 'Question created and published!'
          : 'Question submitted for review. An admin will review it shortly.',
      );
      router.push('/questions');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create question');
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'TEACHER';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/questions">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add Question</h1>
          <p className="text-gray-500">
            {isAdmin
              ? 'Create a new Q&A entry (will be published immediately)'
              : 'Submit a question for admin review'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Question Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject <span className="text-red-500">*</span>
              </label>
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
              >
                <option value="">Select a subject</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Question <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Enter your question here…"
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                rows={3}
                required
                maxLength={5000}
              />
              <p className="mt-1 text-xs text-gray-400">{questionText.length}/5000</p>
            </div>

            {/* Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Answer <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Enter the answer here…"
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={4}
                required
                maxLength={10000}
              />
              <p className="mt-1 text-xs text-gray-400">{answerText.length}/10000</p>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Image <span className="text-gray-400">(optional)</span>
              </label>
              {imagePreview ? (
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full max-h-48 rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">Click to upload an image</span>
                  <span className="text-xs text-gray-400 mt-1">JPG, PNG, GIF, WEBP (max 10MB)</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </label>
              )}
            </div>

            {/* Info notice for students */}
            {!isAdmin && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <strong>Note:</strong> Your question will be submitted for review.
                An administrator will review and approve it before it becomes visible to other students.
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3">
              <Link href="/questions">
                <Button variant="outline" type="button">Cancel</Button>
              </Link>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : isAdmin ? 'Create & Publish' : 'Submit for Review'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
