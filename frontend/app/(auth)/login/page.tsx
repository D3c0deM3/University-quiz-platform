'use client';

import { useState, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LoginPage() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuthStore();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const loginSchema = useMemo(
    () =>
      z.object({
        phone: z.string().min(9, t('login.phoneRequired')).regex(/^\+?[0-9]{9,15}$/, t('login.phoneInvalid')),
        password: z.string().min(1, t('login.passwordRequired')),
      }),
    [t],
  );

  type LoginForm = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      await login(data.phone, data.password);
      toast.success(t('login.success'));
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.push(redirect);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        t('login.error');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <GraduationCap size={24} className="text-blue-600" />
        </div>
        <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
        <CardDescription>{t('login.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              {t('login.phone')}
            </label>
            <Input
              id="phone"
              type="tel"
              placeholder={t('login.phonePlaceholder')}
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-xs text-red-500">{errors.phone.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-zinc-300">
              {t('login.password')}
            </label>
            <Input
              id="password"
              type="password"
              placeholder={t('login.passwordPlaceholder')}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            {t('login.submit')}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500 dark:text-zinc-400">
          {t('login.noAccount')}{' '}
          <Link href="/register" className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
            {t('login.register')}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
