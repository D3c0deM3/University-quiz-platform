import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SubscriptionStatus } from '@prisma/client';
import { AssignSubscriptionDto, BulkAssignDto, UpdateSubscriptionDto } from './dto/index.js';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Admin: assign a subject to a user
   */
  async assign(dto: AssignSubscriptionDto) {
    // Verify user and subject exist
    const [user, subject] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: dto.userId } }),
      this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!subject) throw new NotFoundException('Subject not found');

    // Upsert — reactivate if previously revoked
    return this.prisma.userSubscription.upsert({
      where: {
        userId_subjectId: { userId: dto.userId, subjectId: dto.subjectId },
      },
      update: {
        status: SubscriptionStatus.ACTIVE,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      create: {
        userId: dto.userId,
        subjectId: dto.subjectId,
        status: SubscriptionStatus.ACTIVE,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      include: {
        subject: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  /**
   * Admin: bulk assign subjects to a user
   */
  async bulkAssign(dto: BulkAssignDto) {
    const results: Awaited<ReturnType<typeof this.assign>>[] = [];
    for (const subjectId of dto.subjectIds) {
      const sub = await this.assign({
        userId: dto.userId,
        subjectId,
        expiresAt: dto.expiresAt,
      });
      results.push(sub);
    }
    return results;
  }

  /**
   * Admin: revoke a subscription
   */
  async revoke(subscriptionId: string) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    return this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.REVOKED },
      include: {
        subject: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  /**
   * Admin: update subscription status/expiry
   */
  async update(subscriptionId: string, dto: UpdateSubscriptionDto) {
    const sub = await this.prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!sub) throw new NotFoundException('Subscription not found');

    return this.prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
      },
      include: {
        subject: { select: { id: true, name: true } },
        user: { select: { id: true, firstName: true, lastName: true, phone: true } },
      },
    });
  }

  /**
   * Admin: list ALL subscriptions (with filters)
   */
  async findAll(page = 1, limit = 20, userId?: string, subjectId?: string, status?: SubscriptionStatus) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (userId) where.userId = userId;
    if (subjectId) where.subjectId = subjectId;
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.userSubscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          subject: { select: { id: true, name: true } },
          user: { select: { id: true, firstName: true, lastName: true, phone: true, role: true } },
        },
      }),
      this.prisma.userSubscription.count({ where }),
    ]);
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Admin: list subscriptions for a specific user
   */
  async findByUser(userId: string) {
    return this.prisma.userSubscription.findMany({
      where: { userId },
      include: {
        subject: { select: { id: true, name: true, description: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Student: get my active subscriptions (subject IDs)
   */
  async getMySubscriptions(userId: string) {
    const subs = await this.prisma.userSubscription.findMany({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        subject: { select: { id: true, name: true, description: true, code: true } },
      },
    });
    return {
      subscriptions: subs,
      subjectIds: subs.map((s) => s.subjectId),
    };
  }

  /**
   * Check if user has access to a specific subject
   */
  async hasAccess(userId: string, subjectId: string): Promise<boolean> {
    // Admin/Teacher always have access — caller should check role first
    const sub = await this.prisma.userSubscription.findFirst({
      where: {
        userId,
        subjectId,
        status: SubscriptionStatus.ACTIVE,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });
    return !!sub;
  }
}
