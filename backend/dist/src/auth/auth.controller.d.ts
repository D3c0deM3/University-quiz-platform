import { AuthService } from './auth.service.js';
import { RegisterDto, LoginDto, RegisterWithOtpDto, VerifyOtpDto, GetOtpLinkDto } from './dto/index.js';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    register(dto: RegisterDto, req: any, res: any): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        sessionId: string;
    }>;
    registerWithOtp(dto: RegisterWithOtpDto, req: any, res: any): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        sessionId: string;
    }>;
    getOtpLink(dto: GetOtpLinkDto): Promise<{
        deepLink: string;
        botUsername: string;
        message: string;
    }>;
    verifyOtp(dto: VerifyOtpDto): Promise<{
        verified: boolean;
        message: string;
    }>;
    login(dto: LoginDto, req: any, res: any): Promise<{
        user: {
            id: string;
            phone: string;
            firstName: string;
            lastName: string;
            role: import("@prisma/client").$Enums.Role;
        };
        accessToken: string;
        sessionId: string;
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
    refresh(req: any, res: any): Promise<{
        accessToken: string;
        sessionId: string;
    } | undefined>;
    logout(sessionId: string, req: any, res: any): Promise<{
        message: string;
    }>;
    logoutAll(userId: string, res: any): Promise<{
        message: string;
    }>;
    getSessions(userId: string): Promise<{
        id: string;
        createdAt: Date;
        deviceName: string | null;
        ipFirstSeen: string | null;
        ipLastSeen: string | null;
        userAgent: string | null;
        lastSeenAt: Date;
    }[]>;
    revokeSession(userId: string, sessionId: string): Promise<{
        message: string;
    }>;
}
