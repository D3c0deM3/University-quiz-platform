import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, LoginDto, RegisterWithOtpDto } from './dto/index.js';
import { TelegramService } from '../telegram/telegram.service.js';
export declare class AuthService {
    private prisma;
    private jwtService;
    private configService;
    private telegramService;
    constructor(prisma: PrismaService, jwtService: JwtService, configService: ConfigService, telegramService: TelegramService);
    register(dto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    getOtpLink(phone: string): Promise<{
        deepLink: string;
        botUsername: string;
        message: string;
    }>;
    verifyOtp(phone: string, code: string): Promise<{
        verified: boolean;
        message: string;
    }>;
    registerWithOtp(dto: RegisterWithOtpDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    login(dto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
    }>;
    getProfile(userId: string): Promise<{
        id: string;
        phone: string;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
    }>;
    refreshToken(userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    private generateTokens;
}
