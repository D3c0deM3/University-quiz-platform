import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
export declare class TelegramService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private prisma;
    private readonly logger;
    private bot;
    private botUsername;
    private readonly OTP_LENGTH;
    private readonly OTP_EXPIRY_MINUTES;
    private readonly MAX_OTP_REQUESTS_PER_PHONE;
    private readonly MAX_VERIFY_ATTEMPTS;
    private pendingVerifications;
    constructor(configService: ConfigService, prisma: PrismaService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    getBotUsername(): string;
    getDeepLink(phone: string): string;
    verifyOtp(phone: string, code: string): Promise<{
        valid: boolean;
        message: string;
    }>;
    isPhoneVerified(phone: string): Promise<boolean>;
    private generateOtp;
    cleanupExpiredOtps(): Promise<number>;
}
