'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  GraduationCap,
  ArrowLeft,
  MessageCircle,
  ShieldCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

// ─── OTP Input length ─────────────────────────────────
const OTP_LENGTH = 6;

export default function RegisterPage() {
  const router = useRouter();
  const { registerWithOtp } = useAuthStore();
  const { t } = useTranslation();

  // ─── Step 1: Registration form schema ─────────────────
  const registerSchema = useMemo(() => z.object({
    firstName: z.string().min(1, t('register.firstNameRequired')),
    lastName: z.string().min(1, t('register.lastNameRequired')),
    phone: z.string().min(9, t('register.phoneRequired')).regex(/^\+?[0-9]{9,15}$/, t('register.phoneInvalid')),
    password: z.string().min(6, t('register.passwordMin')),
    confirmPassword: z.string(),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('register.passwordsMismatch'),
    path: ['confirmPassword'],
  }), [t]);

  type RegisterForm = z.infer<typeof registerSchema>;

  // Steps: 1 = registration form, 2 = OTP verification
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState<RegisterForm | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // ─── Step 1: Validate form and move to OTP step ─────
  const onStep1Submit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      // Check phone availability and get bot link preemptively
      await authApi.getOtpLink(data.phone);
      setFormData(data);
      setStep(2);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to proceed. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Get OTP via Telegram ───────────────────────────
  const handleGetOtp = async () => {
    if (!formData) return;
    setOtpLoading(true);
    try {
      // Re-fetch the link in case it changed
      const { data: linkData } = await authApi.getOtpLink(formData.phone);

      // Open Telegram bot in new tab
      window.open(linkData.deepLink, '_blank');
      setOtpSent(true);
      toast.success('Telegram opened! Start the bot and get your code.');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to get OTP link.';
      toast.error(message);
    } finally {
      setOtpLoading(false);
    }
  };

  // ─── OTP input handlers ─────────────────────────────
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return; // only digits

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // take last digit
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pasted.length === 0) return;

    const newOtp = [...otp];
    for (let i = 0; i < OTP_LENGTH && i < pasted.length; i++) {
      newOtp[i] = pasted[i];
    }
    setOtp(newOtp);

    // Focus the next empty input or the last one
    const nextEmpty = newOtp.findIndex((d) => !d);
    const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIdx]?.focus();
  };

  // ─── Verify OTP and register ────────────────────────
  const handleVerifyAndRegister = async () => {
    if (!formData) return;

    const otpCode = otp.join('');
    if (otpCode.length !== OTP_LENGTH) {
      toast.error('Please enter the complete 6-digit code.');
      return;
    }

    setVerifyLoading(true);
    try {
      await registerWithOtp({
        phone: formData.phone,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        otpCode,
      });
      toast.success(t('register.success'));
      router.push('/dashboard');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Verification failed. Please try again.';
      toast.error(message);
    } finally {
      setVerifyLoading(false);
    }
  };

  // Focus first OTP input when entering step 2
  useEffect(() => {
    if (step === 2) {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const otpCode = otp.join('');
  const isOtpComplete = otpCode.length === OTP_LENGTH;

  // ─── Step 1: Registration Form ──────────────────────
  if (step === 1) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <GraduationCap size={24} className="text-blue-600" />
          </div>
          <CardTitle className="text-2xl">{t('register.title')}</CardTitle>
          <CardDescription>{t('register.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="text-sm font-medium text-gray-700 dark:text-zinc-300"
                >
                  {t('register.firstName')}
                </label>
                <Input
                  id="firstName"
                  placeholder="John"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="text-xs text-red-500">
                    {errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="lastName"
                  className="text-sm font-medium text-gray-700 dark:text-zinc-300"
                >
                  {t('register.lastName')}
                </label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-xs text-red-500">
                    {errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="phone"
                className="text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                {t('register.phone')}
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="+998901234567"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                {t('register.password')}
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-700 dark:text-zinc-300"
              >
                {t('register.confirmPassword')}
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-10"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              {t('register.submit')}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-zinc-400">
            {t('register.hasAccount')}{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              {t('register.signIn')}
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  // ─── Step 2: OTP Verification ───────────────────────
  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <ShieldCheck size={24} className="text-blue-600" />
        </div>
        <CardTitle className="text-2xl">{t('register.otpTitle')}</CardTitle>
        <CardDescription>
          {t('register.otpSubtitle')}{' '}
          <span className="font-medium text-gray-700 dark:text-zinc-300">{formData?.phone}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* OTP Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-zinc-300 block text-center">
              {t('register.verifyCode')}
            </label>
            <div
              className="flex justify-center gap-2"
              onPaste={handleOtpPaste}
            >
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="h-12 w-12 rounded-lg border border-gray-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 text-center text-lg font-semibold
                    focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    transition-all duration-150"
                />
              ))}
            </div>
          </div>

          {/* Info text */}
          {!otpSent && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-500/8 p-3 text-center">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('register.getOtp')}
              </p>
            </div>
          )}

          {otpSent && (
            <div className="rounded-lg bg-green-50 dark:bg-green-500/8 p-3 text-center">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Telegram bot opened! Start the bot and copy the 6-digit code
                it sends you.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGetOtp}
              loading={otpLoading}
              disabled={verifyLoading}
            >
              <MessageCircle size={18} />
              {t('register.getOtp')}
            </Button>

            <Button
              type="button"
              className="w-full"
              onClick={handleVerifyAndRegister}
              loading={verifyLoading}
              disabled={!isOtpComplete || otpLoading}
            >
              <ShieldCheck size={18} />
              {t('register.verifyCode')}
            </Button>
          </div>

          {/* Back button */}
          <button
            type="button"
            onClick={() => {
              setStep(1);
              setOtp(Array(OTP_LENGTH).fill(''));
              setOtpSent(false);
            }}
            disabled={verifyLoading || otpLoading}
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-zinc-400 dark:hover:text-zinc-200 w-full transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            {t('register.back')}
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
