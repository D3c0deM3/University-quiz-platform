'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { GraduationCap, ArrowLeft, MessageCircle, ShieldCheck } from 'lucide-react';

// ─── Step 1: Registration form schema ─────────────────
const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    phone: z
      .string()
      .min(9, 'Phone number is required')
      .regex(/^\+?[0-9]{9,15}$/, 'Enter a valid phone number'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

// ─── OTP Input length ─────────────────────────────────
const OTP_LENGTH = 6;

export default function RegisterPage() {
  const router = useRouter();
  const { registerWithOtp } = useAuthStore();

  // Steps: 1 = registration form, 2 = OTP verification
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState<RegisterForm | null>(null);
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [deepLink, setDeepLink] = useState('');
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
      const { data: linkData } = await authApi.getOtpLink(data.phone);
      setDeepLink(linkData.deepLink);
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
      setDeepLink(linkData.deepLink);

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
      toast.success('Account created successfully!');
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
          <CardTitle className="text-2xl">Create an account</CardTitle>
          <CardDescription>Register as a student on UniTest</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="firstName"
                  className="text-sm font-medium text-gray-700"
                >
                  First name
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
                  className="text-sm font-medium text-gray-700"
                >
                  Last name
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
                className="text-sm font-medium text-gray-700"
              >
                Phone number
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
                className="text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium text-gray-700"
              >
                Confirm password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" loading={loading}>
              Create account
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:underline"
            >
              Sign in
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
        <CardTitle className="text-2xl">Verify your phone</CardTitle>
        <CardDescription>
          Enter the 6-digit code from our Telegram bot to verify{' '}
          <span className="font-medium text-gray-700">{formData?.phone}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* OTP Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 block text-center">
              Verification code
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
                  className="h-12 w-12 rounded-lg border border-gray-300 text-center text-lg font-semibold
                    focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20
                    transition-all duration-150"
                />
              ))}
            </div>
          </div>

          {/* Info text */}
          {!otpSent && (
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-sm text-blue-700">
                Click <strong>&quot;Get OTP Code&quot;</strong> below to open our Telegram
                bot. Start the bot and it will send you the verification code.
              </p>
            </div>
          )}

          {otpSent && (
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-sm text-green-700">
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
              {otpSent ? 'Reopen Telegram Bot' : 'Get OTP Code'}
            </Button>

            <Button
              type="button"
              className="w-full"
              onClick={handleVerifyAndRegister}
              loading={verifyLoading}
              disabled={!isOtpComplete || otpLoading}
            >
              <ShieldCheck size={18} />
              Verify Code
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
            className="flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 w-full transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            Back to registration
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
