"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var TelegramService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelegramService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const telegraf_1 = require("telegraf");
const crypto = __importStar(require("crypto"));
const prisma_service_js_1 = require("../prisma/prisma.service.js");
function normalizePhone(raw) {
    const digits = raw.replace(/[^0-9]/g, '');
    return '+' + digits;
}
let TelegramService = TelegramService_1 = class TelegramService {
    configService;
    prisma;
    logger = new common_1.Logger(TelegramService_1.name);
    bot = null;
    botUsername = '';
    OTP_LENGTH = 6;
    OTP_EXPIRY_MINUTES = 5;
    MAX_OTP_REQUESTS_PER_PHONE = 5;
    MAX_VERIFY_ATTEMPTS = 5;
    pendingVerifications = new Map();
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
    }
    async onModuleInit() {
        const token = this.configService.get('TELEGRAM_BOT_TOKEN');
        if (!token) {
            this.logger.warn('TELEGRAM_BOT_TOKEN is not set — Telegram OTP bot will not start');
            return;
        }
        this.bot = new telegraf_1.Telegraf(token);
        this.bot.start(async (ctx) => {
            const payload = ctx.startPayload;
            if (!payload) {
                await ctx.reply('👋 Welcome to UniTest Verification Bot!\n\n' +
                    'This bot is used to verify your phone number during registration.\n\n' +
                    'Please go back to the registration page and click "Get OTP Code" to begin.');
                return;
            }
            const phone = normalizePhone(payload);
            if (!/^\+[0-9]{9,15}$/.test(phone)) {
                await ctx.reply('❌ Invalid phone number format. Please go back to the registration page and try again.');
                return;
            }
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const recentOtps = await this.prisma.otpVerification.count({
                where: { phone, createdAt: { gte: tenMinutesAgo } },
            });
            if (recentOtps >= this.MAX_OTP_REQUESTS_PER_PHONE) {
                await ctx.reply('⏳ Too many OTP requests. Please wait a few minutes before trying again.');
                return;
            }
            const existingUser = await this.prisma.user.findUnique({
                where: { phone },
            });
            if (existingUser) {
                await ctx.reply('⚠️ This phone number is already registered. Please use the login page instead.');
                return;
            }
            const telegramUserId = ctx.from.id;
            this.pendingVerifications.set(telegramUserId, phone);
            await ctx.reply('📱 To verify that you own this phone number, please share your Telegram contact by pressing the button below.', telegraf_1.Markup.keyboard([
                [telegraf_1.Markup.button.contactRequest('📲 Share my phone number')],
            ])
                .oneTime()
                .resize());
        });
        this.bot.on('contact', async (ctx) => {
            const contact = ctx.message.contact;
            const telegramUserId = ctx.from.id;
            if (contact.user_id !== telegramUserId) {
                await ctx.reply('❌ Please share your own contact, not someone else\'s.', telegraf_1.Markup.removeKeyboard());
                return;
            }
            const expectedPhone = this.pendingVerifications.get(telegramUserId);
            if (!expectedPhone) {
                await ctx.reply('⚠️ No pending verification found. Please go back to the registration page and click "Get OTP Code" first.', telegraf_1.Markup.removeKeyboard());
                return;
            }
            const telegramPhone = normalizePhone(contact.phone_number);
            if (telegramPhone !== expectedPhone) {
                this.pendingVerifications.delete(telegramUserId);
                await ctx.reply('❌ The phone number on your Telegram account does not match the one you entered during registration.\n\n' +
                    `Registered: ${expectedPhone}\n` +
                    `Telegram:   ${telegramPhone}\n\n` +
                    'Please go back and register with the phone number linked to your Telegram account.', telegraf_1.Markup.removeKeyboard());
                return;
            }
            this.pendingVerifications.delete(telegramUserId);
            await this.prisma.otpVerification.updateMany({
                where: {
                    phone: expectedPhone,
                    verified: false,
                    expiresAt: { gte: new Date() },
                },
                data: { expiresAt: new Date() },
            });
            const code = this.generateOtp();
            const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
            await this.prisma.otpVerification.create({
                data: {
                    phone: expectedPhone,
                    code,
                    expiresAt,
                },
            });
            this.logger.log(`OTP generated for phone ${expectedPhone} (Telegram user ${telegramUserId})`);
            await ctx.reply(`✅ Phone number verified!\n\n` +
                `Your verification code for UniTest:\n\n` +
                `🔐 <b>${code}</b>\n\n` +
                `This code expires in ${this.OTP_EXPIRY_MINUTES} minutes.\n` +
                `Go back to the registration page and enter this code to complete your registration.`, { parse_mode: 'HTML', ...telegraf_1.Markup.removeKeyboard() });
        });
        this.bot.on('message', async (ctx) => {
            await ctx.reply('ℹ️ This bot is used for phone verification only.\n\n' +
                'Please use the registration page at UniTest to get your verification code.');
        });
        try {
            this.bot.launch();
            const botInfo = await this.bot.telegram.getMe();
            this.botUsername = botInfo.username;
            this.logger.log(`Telegram bot @${this.botUsername} started successfully`);
        }
        catch (error) {
            this.logger.error('Failed to start Telegram bot', error);
        }
    }
    async onModuleDestroy() {
        if (this.bot) {
            this.bot.stop('Application shutdown');
        }
    }
    getBotUsername() {
        return this.botUsername;
    }
    getDeepLink(phone) {
        const botName = this.botUsername ||
            this.configService.get('TELEGRAM_BOT_USERNAME', '');
        const payload = phone.replace(/^\+/, '');
        return `https://t.me/${botName}?start=${payload}`;
    }
    async verifyOtp(phone, code) {
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
                message: 'No valid OTP found. Please request a new verification code via Telegram.',
            };
        }
        if (otp.attempts >= this.MAX_VERIFY_ATTEMPTS) {
            await this.prisma.otpVerification.update({
                where: { id: otp.id },
                data: { expiresAt: new Date() },
            });
            return {
                valid: false,
                message: 'Too many incorrect attempts. Please request a new verification code.',
            };
        }
        await this.prisma.otpVerification.update({
            where: { id: otp.id },
            data: { attempts: otp.attempts + 1 },
        });
        const isValid = crypto.timingSafeEqual(Buffer.from(code.trim()), Buffer.from(otp.code));
        if (!isValid) {
            const remaining = this.MAX_VERIFY_ATTEMPTS - (otp.attempts + 1);
            return {
                valid: false,
                message: remaining > 0
                    ? `Invalid code. ${remaining} attempt(s) remaining.`
                    : 'Too many incorrect attempts. Please request a new verification code.',
            };
        }
        await this.prisma.otpVerification.update({
            where: { id: otp.id },
            data: { verified: true },
        });
        return { valid: true, message: 'Phone number verified successfully.' };
    }
    async isPhoneVerified(phone) {
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
    generateOtp() {
        const digits = '0123456789';
        const bytes = crypto.randomBytes(this.OTP_LENGTH);
        let otp = '';
        for (let i = 0; i < this.OTP_LENGTH; i++) {
            otp += digits[bytes[i] % 10];
        }
        return otp;
    }
    async cleanupExpiredOtps() {
        const result = await this.prisma.otpVerification.deleteMany({
            where: {
                expiresAt: { lt: new Date() },
            },
        });
        return result.count;
    }
};
exports.TelegramService = TelegramService;
exports.TelegramService = TelegramService = TelegramService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_js_1.PrismaService])
], TelegramService);
//# sourceMappingURL=telegram.service.js.map