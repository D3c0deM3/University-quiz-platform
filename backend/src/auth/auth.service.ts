import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto, LoginDto, RegisterWithOtpDto } from './dto/index.js';
import { TelegramService } from '../telegram/telegram.service.js';
import type { JwtPayload } from './strategies/jwt.strategy.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private telegramService: TelegramService,
  ) {}

  async register(dto: RegisterDto) {
    // Check if user already exists by phone
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate a placeholder email from phone if not provided
    const email = dto.email || `${dto.phone.replace(/\+/g, '')}@phone.local`;

    // Create user (default role: STUDENT)
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Get the Telegram bot deep link for OTP verification.
   * Also checks that the phone is not already registered.
   */
  async getOtpLink(phone: string) {
    const existing = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const deepLink = this.telegramService.getDeepLink(phone);
    const botUsername = this.telegramService.getBotUsername();

    return {
      deepLink,
      botUsername,
      message: 'Open the Telegram link to receive your verification code.',
    };
  }

  /**
   * Verify OTP code without registering yet.
   * Returns success/failure so frontend can show result before final registration.
   */
  async verifyOtp(phone: string, code: string) {
    const result = await this.telegramService.verifyOtp(phone, code);

    if (!result.valid) {
      throw new BadRequestException(result.message);
    }

    return { verified: true, message: result.message };
  }

  /**
   * Register a new user with OTP verification.
   * The phone must have been verified via Telegram OTP first.
   */
  async registerWithOtp(dto: RegisterWithOtpDto) {
    // First verify the OTP code
    const otpResult = await this.telegramService.verifyOtp(dto.phone, dto.otpCode);
    if (!otpResult.valid) {
      throw new BadRequestException(otpResult.message);
    }

    // Check if user already exists
    const existing = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    // Generate a placeholder email from phone if not provided
    const email = dto.email || `${dto.phone.replace(/\+/g, '')}@phone.local`;

    // Create user (default role: STUDENT)
    const user = await this.prisma.user.create({
      data: {
        email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    // Find user by phone
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Compare password
    const passwordValid = await bcrypt.compare(dto.password, user.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  async refreshToken(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return tokens;
  }

  private async generateTokens(payload: JwtPayload) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRATION', '1d') as any,
      }),
      this.jwtService.signAsync(payload as any, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>(
          'JWT_REFRESH_EXPIRATION',
          '7d',
        ) as any,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
}
