import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
  sessionId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Validate that the session is still active (if sessionId is in the token)
    if (payload.sessionId) {
      const session = await this.prisma.userSession.findFirst({
        where: {
          id: payload.sessionId,
          userId: user.id,
          status: 'ACTIVE',
        },
      });

      if (!session) {
        throw new UnauthorizedException(
          'Session has been revoked. Please log in again.',
        );
      }
    }

    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      sessionId: payload.sessionId,
    };
  }
}
