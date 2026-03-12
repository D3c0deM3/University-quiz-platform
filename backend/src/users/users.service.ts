import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto, UpdateUserDto, AssignRoleDto } from './dto/index.js';
import { Role, SessionStatus, SessionEventType } from '@prisma/client';

const MAX_ALLOWED_RECENT_DEVICES = 2;
const DEVICE_WINDOW_DAYS = 7;

type SessionSnapshot = {
  id: string;
  fingerprintHash: string | null;
  deviceName: string | null;
  userAgent: string | null;
  ipFirstSeen: string | null;
  ipLastSeen: string | null;
  status: SessionStatus;
  createdAt: Date;
  lastSeenAt: Date;
};

type SessionLike = {
  userAgent: string | null;
  deviceName: string | null;
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private isAutomatedUserAgent(userAgent: string | null) {
    if (!userAgent) return false;
    return /(curl|postmanruntime|insomnia|httpie|python-requests|wget|go-http-client|node-fetch)/i.test(
      userAgent,
    );
  }

  private shouldCountSession(session: SessionLike) {
    return !this.isAutomatedUserAgent(session.userAgent);
  }

  private isMissingBlockedDevicesTable(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const e = error as { code?: string; meta?: unknown };
    if (e.code !== 'P2021') return false;
    const serialized = JSON.stringify(e.meta ?? e);
    return serialized.includes('blocked_devices');
  }

  async create(dto: CreateUserDto) {
    const existingByPhone = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existingByPhone) throw new ConflictException('Phone number already registered');

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role ?? Role.STUDENT,
      },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAll(page = 1, limit = 20, role?: Role, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSuspiciousUsers(page = 1, limit = 20, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { phone: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    let users: Array<{
      id: string;
      phone: string;
      firstName: string;
      lastName: string;
      role: Role;
      isActive: boolean;
      createdAt: Date;
      sessions: SessionSnapshot[];
      blockedDevices: Array<{ id: string; fingerprintHash: string; blockedAt: Date }>;
    }> = [];

    try {
      users = await this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          sessions: {
            select: {
              id: true,
              fingerprintHash: true,
              deviceName: true,
              userAgent: true,
              ipFirstSeen: true,
              ipLastSeen: true,
              status: true,
              createdAt: true,
              lastSeenAt: true,
            },
          },
          blockedDevices: {
            where: { isBlocked: true },
            select: {
              id: true,
              fingerprintHash: true,
              blockedAt: true,
            },
          },
        },
      });
    } catch (error) {
      if (!this.isMissingBlockedDevicesTable(error)) {
        throw error;
      }

      const fallbackUsers = await this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          sessions: {
            select: {
              id: true,
              fingerprintHash: true,
              deviceName: true,
              userAgent: true,
              ipFirstSeen: true,
              ipLastSeen: true,
              status: true,
              createdAt: true,
              lastSeenAt: true,
            },
          },
        },
      });

      users = fallbackUsers.map((user) => ({
        ...user,
        blockedDevices: [],
      }));
    }

    const recentCutoff = new Date(
      Date.now() - DEVICE_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const suspicious = users
      .map((user) => {
        const countableSessions = user.sessions.filter((session) =>
          this.shouldCountSession(session),
        );
        const countableRecentSessions = countableSessions.filter(
          (session) => session.createdAt >= recentCutoff,
        );

        const recentDeviceCount = this.countDistinctDevicesRelaxed(
          countableRecentSessions,
        );
        const activeSessionCount = countableSessions.filter(
          (session) => session.status === SessionStatus.ACTIVE,
        ).length;

        return {
          id: user.id,
          phone: user.phone,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt,
          deviceCount: this.countDistinctDevicesRelaxed(countableSessions),
          recentDeviceCount,
          activeSessionCount,
          blockedDeviceCount: user.blockedDevices.length,
          autoBlocked: !user.isActive && recentDeviceCount > MAX_ALLOWED_RECENT_DEVICES,
        };
      })
      .filter((user) => {
        return (
          user.recentDeviceCount > MAX_ALLOWED_RECENT_DEVICES ||
          !user.isActive ||
          user.blockedDeviceCount > 0
        );
      });

    const start = (page - 1) * limit;
    const pagedData = suspicious.slice(start, start + limit);

    return {
      data: pagedData,
      meta: {
        total: suspicious.length,
        page,
        limit,
        totalPages: Math.ceil(suspicious.length / limit),
        maxAllowedDevices: MAX_ALLOWED_RECENT_DEVICES,
        deviceWindowDays: DEVICE_WINDOW_DAYS,
      },
    };
  }

  async getUserDevices(userId: string) {
    let user:
      | {
          id: string;
          phone: string;
          firstName: string;
          lastName: string;
          isActive: boolean;
          sessions: SessionSnapshot[];
          blockedDevices: Array<{
            fingerprintHash: string;
            reason: string | null;
            blockedAt: Date;
          }>;
        }
      | null = null;

    try {
      user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          isActive: true,
          sessions: {
            orderBy: { lastSeenAt: 'desc' },
            select: {
              id: true,
              fingerprintHash: true,
              deviceName: true,
              userAgent: true,
              ipFirstSeen: true,
              ipLastSeen: true,
              status: true,
              createdAt: true,
              lastSeenAt: true,
            },
          },
          blockedDevices: {
            where: { isBlocked: true },
            select: {
              fingerprintHash: true,
              reason: true,
              blockedAt: true,
            },
          },
        },
      });
    } catch (error) {
      if (!this.isMissingBlockedDevicesTable(error)) {
        throw error;
      }

      const fallbackUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          phone: true,
          firstName: true,
          lastName: true,
          isActive: true,
          sessions: {
            orderBy: { lastSeenAt: 'desc' },
            select: {
              id: true,
              fingerprintHash: true,
              deviceName: true,
              userAgent: true,
              ipFirstSeen: true,
              ipLastSeen: true,
              status: true,
              createdAt: true,
              lastSeenAt: true,
            },
          },
        },
      });

      user = fallbackUser
        ? {
            ...fallbackUser,
            blockedDevices: [],
          }
        : null;
    }

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const blockedMap = new Map(
      user.blockedDevices.map((device) => [device.fingerprintHash, device]),
    );

    const countableSessions = user.sessions.filter((session) =>
      this.shouldCountSession(session),
    );

    const devices = this.aggregateDevices(countableSessions).map((device) => {
      const blockedInfo = device.fingerprintHash
        ? blockedMap.get(device.fingerprintHash)
        : undefined;

      return {
        ...device,
        blocked: !!blockedInfo,
        blockedReason: blockedInfo?.reason || null,
        blockedAt: blockedInfo?.blockedAt || null,
      };
    });

    return {
      user: {
        id: user.id,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
      devices,
    };
  }

  async blockUserAccount(userId: string, blockedById: string, reason?: string) {
    await this.findOne(userId);

    const activeSessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        status: SessionStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (activeSessions.length > 0) {
      await this.prisma.sessionEvent.createMany({
        data: activeSessions.map((session) => ({
          sessionId: session.id,
          eventType: SessionEventType.FORCED_LOGOUT,
          metadata: {
            reason: 'admin_blocked_account',
            blockedById,
            note: reason || null,
          },
        })),
      });

      await this.prisma.userSession.updateMany({
        where: {
          userId,
          status: SessionStatus.ACTIVE,
        },
        data: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
        },
      });
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return {
      message: 'User account blocked successfully',
      user,
    };
  }

  async unblockUserAccount(userId: string) {
    await this.findOne(userId);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    return {
      message: 'User account unblocked successfully',
      user,
    };
  }

  async blockDevice(
    userId: string,
    fingerprintRaw: string,
    blockedById: string,
    reason?: string,
  ) {
    await this.findOne(userId);

    if (!fingerprintRaw?.trim()) {
      throw new BadRequestException('fingerprintHash is required');
    }

    const fingerprintHash = this.normalizeFingerprint(fingerprintRaw);

    const latestSession = await this.prisma.userSession.findFirst({
      where: { userId, fingerprintHash },
      orderBy: { lastSeenAt: 'desc' },
      select: { deviceName: true },
    });

    let blockedDevice: any;
    try {
      blockedDevice = await this.prisma.blockedDevice.upsert({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash,
          },
        },
        update: {
          isBlocked: true,
          unblockedAt: null,
          blockedAt: new Date(),
          reason: reason || null,
          blockedById,
          deviceName: latestSession?.deviceName || null,
        },
        create: {
          userId,
          fingerprintHash,
          deviceName: latestSession?.deviceName || null,
          reason: reason || null,
          blockedById,
          isBlocked: true,
        },
      });
    } catch (error) {
      if (this.isMissingBlockedDevicesTable(error)) {
        throw new BadRequestException(
          'Device blocking is unavailable until blocked_devices migration is applied',
        );
      }
      throw error;
    }

    const activeSessions = await this.prisma.userSession.findMany({
      where: {
        userId,
        fingerprintHash,
        status: SessionStatus.ACTIVE,
      },
      select: { id: true },
    });

    if (activeSessions.length > 0) {
      await this.prisma.sessionEvent.createMany({
        data: activeSessions.map((session) => ({
          sessionId: session.id,
          eventType: SessionEventType.FORCED_LOGOUT,
          metadata: {
            reason: 'admin_blocked_device',
            blockedById,
          },
        })),
      });

      await this.prisma.userSession.updateMany({
        where: {
          userId,
          fingerprintHash,
          status: SessionStatus.ACTIVE,
        },
        data: {
          status: SessionStatus.REVOKED,
          revokedAt: new Date(),
        },
      });
    }

    return {
      message: 'Device blocked successfully',
      blockedDevice,
    };
  }

  async unblockDevice(userId: string, fingerprintRaw: string) {
    await this.findOne(userId);

    if (!fingerprintRaw?.trim()) {
      throw new BadRequestException('fingerprintHash is required');
    }

    const fingerprintHash = this.normalizeFingerprint(fingerprintRaw);

    let existing: { id: string } | null = null;
    try {
      existing = await this.prisma.blockedDevice.findUnique({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash,
          },
        },
        select: { id: true },
      });
    } catch (error) {
      if (this.isMissingBlockedDevicesTable(error)) {
        throw new BadRequestException(
          'Device unblocking is unavailable until blocked_devices migration is applied',
        );
      }
      throw error;
    }

    if (!existing) {
      throw new NotFoundException('Blocked device not found');
    }

    let blockedDevice: any;
    try {
      blockedDevice = await this.prisma.blockedDevice.update({
        where: {
          userId_fingerprintHash: {
            userId,
            fingerprintHash,
          },
        },
        data: {
          isBlocked: false,
          unblockedAt: new Date(),
        },
      });
    } catch (error) {
      if (this.isMissingBlockedDevicesTable(error)) {
        throw new BadRequestException(
          'Device unblocking is unavailable until blocked_devices migration is applied',
        );
      }
      throw error;
    }

    return {
      message: 'Device unblocked successfully',
      blockedDevice,
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const data: any = { ...dto };
    if (dto.password) {
      data.password = await bcrypt.hash(dto.password, 10);
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async assignRole(id: string, dto: AssignRoleDto) {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: {
        id: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    return user;
  }

  private normalizeFingerprint(fingerprintRaw: string) {
    const normalized = fingerprintRaw.trim();
    if (/^[a-f0-9]{64}$/i.test(normalized)) {
      return normalized.toLowerCase();
    }
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private aggregateDevices(sessions: SessionSnapshot[]) {
    const byDevice = new Map<
      string,
      {
        deviceKey: string;
        fingerprintHash: string | null;
        deviceName: string | null;
        userAgent: string | null;
        firstSeenAt: Date;
        lastSeenAt: Date;
        lastIp: string | null;
        totalSessions: number;
        activeSessions: number;
      }
    >();

    for (const session of sessions) {
      const deviceKey = this.getDeviceKey(session);
      const existing = byDevice.get(deviceKey);

      if (!existing) {
        byDevice.set(deviceKey, {
          deviceKey,
          fingerprintHash: session.fingerprintHash,
          deviceName: session.deviceName,
          userAgent: session.userAgent,
          firstSeenAt: session.createdAt,
          lastSeenAt: session.lastSeenAt,
          lastIp: session.ipLastSeen || session.ipFirstSeen,
          totalSessions: 1,
          activeSessions: session.status === SessionStatus.ACTIVE ? 1 : 0,
        });
        continue;
      }

      existing.totalSessions += 1;
      if (session.status === SessionStatus.ACTIVE) {
        existing.activeSessions += 1;
      }
      if (session.createdAt < existing.firstSeenAt) {
        existing.firstSeenAt = session.createdAt;
      }
      if (session.lastSeenAt > existing.lastSeenAt) {
        existing.lastSeenAt = session.lastSeenAt;
        existing.lastIp = session.ipLastSeen || session.ipFirstSeen;
      }
      if (!existing.deviceName && session.deviceName) {
        existing.deviceName = session.deviceName;
      }
      if (!existing.userAgent && session.userAgent) {
        existing.userAgent = session.userAgent;
      }
      if (!existing.fingerprintHash && session.fingerprintHash) {
        existing.fingerprintHash = session.fingerprintHash;
      }
    }

    return Array.from(byDevice.values()).sort(
      (a, b) => b.lastSeenAt.getTime() - a.lastSeenAt.getTime(),
    );
  }

  private getDeviceKey(session: SessionSnapshot) {
    if (session.fingerprintHash) {
      return `fp:${session.fingerprintHash}`;
    }

    const fallback = `${session.deviceName || 'unknown'}|${session.userAgent || 'unknown'}|${session.ipFirstSeen || 'unknown'}`;
    return `legacy:${fallback}`;
  }

  private countDistinctDevicesRelaxed(sessions: SessionSnapshot[]) {
    const signatures = new Set<string>();
    for (const session of sessions) {
      signatures.add(this.getRelaxedDeviceSignature(session));
    }
    return signatures.size;
  }

  private getRelaxedDeviceSignature(session: SessionSnapshot) {
    const deviceName = (session.deviceName || '').trim().toLowerCase();
    const normalizedAgent = this.normalizeUserAgent(session.userAgent);

    if (deviceName) {
      return `sig:${deviceName}`;
    }

    if (normalizedAgent) {
      return `ua:${normalizedAgent}`;
    }

    if (session.fingerprintHash) {
      return `fp:${session.fingerprintHash}`;
    }

    return `legacy:${session.ipFirstSeen || session.ipLastSeen || 'unknown'}`;
  }

  private normalizeUserAgent(userAgent: string | null) {
    if (!userAgent) return '';
    return userAgent
      .toLowerCase()
      .replace(/[0-9._]+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);
  }
}
