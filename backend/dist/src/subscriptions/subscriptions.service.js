"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
let SubscriptionsService = class SubscriptionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async assign(dto) {
        const [user, subject] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: dto.userId } }),
            this.prisma.subject.findUnique({ where: { id: dto.subjectId } }),
        ]);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        if (!subject)
            throw new common_1.NotFoundException('Subject not found');
        return this.prisma.userSubscription.upsert({
            where: {
                userId_subjectId: { userId: dto.userId, subjectId: dto.subjectId },
            },
            update: {
                status: client_1.SubscriptionStatus.ACTIVE,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
            create: {
                userId: dto.userId,
                subjectId: dto.subjectId,
                status: client_1.SubscriptionStatus.ACTIVE,
                expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
            },
            include: {
                subject: { select: { id: true, name: true } },
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
        });
    }
    async bulkAssign(dto) {
        const results = [];
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
    async revoke(subscriptionId) {
        const sub = await this.prisma.userSubscription.findUnique({
            where: { id: subscriptionId },
        });
        if (!sub)
            throw new common_1.NotFoundException('Subscription not found');
        return this.prisma.userSubscription.update({
            where: { id: subscriptionId },
            data: { status: client_1.SubscriptionStatus.REVOKED },
            include: {
                subject: { select: { id: true, name: true } },
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
        });
    }
    async update(subscriptionId, dto) {
        const sub = await this.prisma.userSubscription.findUnique({
            where: { id: subscriptionId },
        });
        if (!sub)
            throw new common_1.NotFoundException('Subscription not found');
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
                user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
            },
        });
    }
    async findAll(page = 1, limit = 20, userId, subjectId, status) {
        const skip = (page - 1) * limit;
        const where = {};
        if (userId)
            where.userId = userId;
        if (subjectId)
            where.subjectId = subjectId;
        if (status)
            where.status = status;
        const [data, total] = await Promise.all([
            this.prisma.userSubscription.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    subject: { select: { id: true, name: true } },
                    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true } },
                },
            }),
            this.prisma.userSubscription.count({ where }),
        ]);
        return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    }
    async findByUser(userId) {
        return this.prisma.userSubscription.findMany({
            where: { userId },
            include: {
                subject: { select: { id: true, name: true, description: true, code: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getMySubscriptions(userId) {
        const subs = await this.prisma.userSubscription.findMany({
            where: {
                userId,
                status: client_1.SubscriptionStatus.ACTIVE,
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
    async hasAccess(userId, subjectId) {
        const sub = await this.prisma.userSubscription.findFirst({
            where: {
                userId,
                subjectId,
                status: client_1.SubscriptionStatus.ACTIVE,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
        });
        return !!sub;
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map