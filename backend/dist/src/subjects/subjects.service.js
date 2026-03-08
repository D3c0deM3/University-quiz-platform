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
exports.SubjectsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
let SubjectsService = class SubjectsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto) {
        const existing = await this.prisma.subject.findUnique({
            where: { name: dto.name },
        });
        if (existing) {
            throw new common_1.ConflictException('Subject with this name already exists');
        }
        if (dto.code) {
            const existingCode = await this.prisma.subject.findUnique({
                where: { code: dto.code },
            });
            if (existingCode) {
                throw new common_1.ConflictException('Subject with this code already exists');
            }
        }
        return this.prisma.subject.create({ data: dto });
    }
    async findAll(page = 1, limit = 20, search) {
        const skip = (page - 1) * limit;
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
            ];
        }
        const [subjects, total] = await Promise.all([
            this.prisma.subject.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' },
                include: {
                    _count: {
                        select: {
                            materials: true,
                            quizzes: true,
                        },
                    },
                },
            }),
            this.prisma.subject.count({ where }),
        ]);
        return {
            data: subjects,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async findOne(id) {
        const subject = await this.prisma.subject.findUnique({
            where: { id },
            include: {
                _count: {
                    select: {
                        materials: true,
                        quizzes: true,
                    },
                },
            },
        });
        if (!subject) {
            throw new common_1.NotFoundException('Subject not found');
        }
        return subject;
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.name) {
            const existing = await this.prisma.subject.findFirst({
                where: { name: dto.name, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException('Subject with this name already exists');
            }
        }
        if (dto.code) {
            const existing = await this.prisma.subject.findFirst({
                where: { code: dto.code, NOT: { id } },
            });
            if (existing) {
                throw new common_1.ConflictException('Subject with this code already exists');
            }
        }
        return this.prisma.subject.update({
            where: { id },
            data: dto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.subject.delete({ where: { id } });
        return { message: 'Subject deleted successfully' };
    }
};
exports.SubjectsService = SubjectsService;
exports.SubjectsService = SubjectsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], SubjectsService);
//# sourceMappingURL=subjects.service.js.map