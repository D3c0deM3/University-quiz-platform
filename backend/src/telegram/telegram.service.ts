import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Normalise a phone number to E.164-ish format so we can compare
 * the number from the deep-link with the one Telegram returns.
 * Strips everything except digits, then prepends '+'.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  return '+' + digits;
}

@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot: Telegraf | null = null;
  private botUsername = '';

  /** OTP settings */
  private readonly OTP_LENGTH = 6;
  private readonly OTP_EXPIRY_MINUTES = 5;
  private readonly MAX_OTP_REQUESTS_PER_PHONE = 5; // per 10 minutes
  private readonly MAX_VERIFY_ATTEMPTS = 5;

  /**
   * In-memory map: telegramUserId → phone from deep-link.
   * Lives only as long as the process; entries are cleaned up after use.
   */
  private pendingVerifications = new Map<number, string>();

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async onModuleInit() {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN is not set — Telegram OTP bot will not start',
      );
      return;
    }

    this.bot = new Telegraf(token);

    // ── /start with deep-link payload (phone number) ─────────────
    this.bot.start(async (ctx) => {
      const payload = (ctx as any).startPayload as string | undefined;

      if (!payload) {
        await ctx.reply(
          '👋 Welcome to UniTest Verification Bot!\n\n' +
            'This bot is used to verify your phone number during registration.\n\n' +
            'Please go back to the registration page and click "Get OTP Code" to begin.',
        );
        return;
      }

      // Payload is the phone number without the '+' prefix
      const phone = normalizePhone(payload);

      if (!/^\+[0-9]{9,15}$/.test(phone)) {
        await ctx.reply(
          '❌ Invalid phone number format. Please go back to the registration page and try again.',
        );
        return;
      }

      // Rate-limit: max N OTP requests per phone in last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentOtps = await this.prisma.otpVerification.count({
        where: { phone, createdAt: { gte: tenMinutesAgo } },
      });

      if (recentOtps >= this.MAX_OTP_REQUESTS_PER_PHONE) {
        await ctx.reply(
          '⏳ Too many OTP requests. Please wait a few minutes before trying again.',
        );
        return;
      }

      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { phone },
      });
      if (existingUser) {
        await ctx.reply(
          '⚠️ This phone number is already registered. Please use the login page instead.',
        );
        return;
      }

      // Store the phone in the pending map so we can match it when the user
      // shares their contact
      const telegramUserId = ctx.from.id;
      this.pendingVerifications.set(telegramUserId, phone);

      // Ask the user to share their Telegram contact so we can verify
      // that the phone number on their Telegram account matches the one
      // they entered during registration.
      await ctx.reply(
        '📱 To verify that you own this phone number, please share your Telegram contact by pressing the button below.',
        Markup.keyboard([
          [Markup.button.contactRequest('📲 Share my phone number')],
        ])
          .oneTime()
          .resize(),
      );
    });

    // ── Handle shared contact ────────────────────────────────────
    this.bot.on('contact', async (ctx) => {
      const contact = ctx.message.contact;
      const telegramUserId = ctx.from.id;

      // Only accept the user's own contact (not a forwarded one)
      if (contact.user_id !== telegramUserId) {
        await ctx.reply(
          '❌ Please share your own contact, not someone else\'s.',
          Markup.removeKeyboard(),
        );
        return;
      }

      // Look up the pending phone from the /start deep-link
      const expectedPhone = this.pendingVerifications.get(telegramUserId);

      if (!expectedPhone) {
        await ctx.reply(
          '⚠️ No pending verification found. Please go back to the registration page and click "Get OTP Code" first.',
          Markup.removeKeyboard(),
        );
        return;
      }

      // Normalise the phone number Telegram gives us
      const telegramPhone = normalizePhone(contact.phone_number);

      // Compare the two numbers
      if (telegramPhone !== expectedPhone) {
        // Clean up
        this.pendingVerifications.delete(telegramUserId);

        await ctx.reply(
          '❌ The phone number on your Telegram account does not match the one you entered during registration.\n\n' +
            `Registered: ${expectedPhone}\n` +
            `Telegram:   ${telegramPhone}\n\n` +
            'Please go back and register with the phone number linked to your Telegram account.',
          Markup.removeKeyboard(),
        );
        return;
      }

      // Phones match → generate OTP
      this.pendingVerifications.delete(telegramUserId);

      // Invalidate previous unused OTPs for this phone
      await this.prisma.otpVerification.updateMany({
        where: {
          phone: expectedPhone,
          verified: false,
          expiresAt: { gte: new Date() },
        },
        data: { expiresAt: new Date() },
      });

      const code = this.generateOtp();
      const expiresAt = new Date(
        Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000,
      );

      await this.prisma.otpVerification.create({
        data: {
          phone: expectedPhone,
          code,
          expiresAt,
        },
      });

      this.logger.log(
        `OTP generated for phone ${expectedPhone} (Telegram user ${telegramUserId})`,
      );

      await ctx.reply(
        `✅ Phone number verified!\n\n` +
          `Your verification code for UniTest:\n\n` +
          `🔐 <b>${code}</b>\n\n` +
          `This code expires in ${this.OTP_EXPIRY_MINUTES} minutes.\n` +
          `Go back to the registration page and enter this code to complete your registration.`,
        { parse_mode: 'HTML', ...Markup.removeKeyboard() },
      );
    });

    // ── Handle any other message ─────────────────────────────────
    this.bot.on('message', async (ctx) => {
      await ctx.reply(
        'ℹ️ This bot is used for phone verification only.\n\n' +
          'Please use the registration page at UniTest to get your verification code.',
      );
    });

    // Launch bot
    try {
      this.bot.launch();
      const botInfo = await this.bot.telegram.getMe();
      this.botUsername = botInfo.username;
      this.logger.log(`Telegram bot @${this.botUsername} started successfully`);
    } catch (error) {
      this.logger.error('Failed to start Telegram bot', error);
    }
  }

  async onModuleDestroy() {
    if (this.bot) {
      this.bot.stop('Application shutdown');
    }
  }

  /**
   * Get the bot username for generating deep links
   */
  getBotUsername(): string {
    return this.botUsername;
  }

  /**
   * Get the Telegram deep link URL for OTP verification
   */
  getDeepLink(phone: string): string {
    const botName =
      this.botUsername ||
      this.configService.get<string>('TELEGRAM_BOT_USERNAME', '');
    // Strip the '+' for the deep link payload (Telegram only allows [A-Za-z0-9_-])
    const payload = phone.replace(/^\+/, '');
    return `https://t.me/${botName}?start=${payload}`;
  }

  /**
   * Verify OTP code for a given phone number
   * Returns true if valid, throws descriptive errors otherwise
   */
  async verifyOtp(
    phone: string,
    code: string,
  ): Promise<{ valid: boolean; message: string }> {
    // Find the latest unexpired, unverified OTP for this phone
    const otp = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return {
        valid: false,
        message:
          'No valid OTP found. Please request a new verification code via Telegram.',
      };
    }

    // Check attempt limit
    if (otp.attempts >= this.MAX_VERIFY_ATTEMPTS) {
      // Expire this OTP
      await this.prisma.otpVerification.update({
        where: { id: otp.id },
        data: { expiresAt: new Date() },
      });
      return {
        valid: false,
        message:
          'Too many incorrect attempts. Please request a new verification code.',
      };
    }

    // Increment attempts
    await this.prisma.otpVerification.update({
      where: { id: otp.id },
      data: { attempts: otp.attempts + 1 },
    });

    // Timing-safe comparison
    const isValid = crypto.timingSafeEqual(
      Buffer.from(code.trim()),
      Buffer.from(otp.code),
    );

    if (!isValid) {
      const remaining = this.MAX_VERIFY_ATTEMPTS - (otp.attempts + 1);
      return {
        valid: false,
        message:
          remaining > 0
            ? `Invalid code. ${remaining} attempt(s) remaining.`
            : 'Too many incorrect attempts. Please request a new verification code.',
      };
    }

    // Mark as verified
    await this.prisma.otpVerification.update({
      where: { id: otp.id },
      data: { verified: true },
    });

    return { valid: true, message: 'Phone number verified successfully.' };
  }

  /**
   * Check if a phone has been recently verified (within OTP_EXPIRY_MINUTES)
   */
  async isPhoneVerified(phone: string): Promise<boolean> {
    const verification = await this.prisma.otpVerification.findFirst({
      where: {
        phone,
        verified: true,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return !!verification;
  }

  /**
   * Generate a cryptographically secure OTP code
   */
  private generateOtp(): string {
    const digits = '0123456789';
    const bytes = crypto.randomBytes(this.OTP_LENGTH);
    let otp = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      otp += digits[bytes[i] % 10];
    }
    return otp;
  }

  /**
   * Cleanup expired OTPs (can be called periodically)
   */
  async cleanupExpiredOtps(): Promise<number> {
    const result = await this.prisma.otpVerification.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
    return result.count;
  }
}
