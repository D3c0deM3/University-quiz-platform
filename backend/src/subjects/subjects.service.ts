import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSubjectDto, UpdateSubjectDto } from './dto/index.js';

@Injectable()
export class SubjectsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSubjectDto) {
    const existing = await this.prisma.subject.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Subject with this name already exists');
    }

    if (dto.code) {
      const existingCode = await this.prisma.subject.findUnique({
        where: { code: dto.code },
      });
      if (existingCode) {
        throw new ConflictException('Subject with this code already exists');
      }
    }

    return this.prisma.subject.create({ data: dto });
  }

  async findAll(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = {};
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

  async findOne(id: string) {
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
      throw new NotFoundException('Subject not found');
    }

    return subject;
  }

  async update(id: string, dto: UpdateSubjectDto) {
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.subject.findFirst({
        where: { name: dto.name, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Subject with this name already exists');
      }
    }

    if (dto.code) {
      const existing = await this.prisma.subject.findFirst({
        where: { code: dto.code, NOT: { id } },
      });
      if (existing) {
        throw new ConflictException('Subject with this code already exists');
      }
    }

    return this.prisma.subject.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.subject.delete({ where: { id } });
    return { message: 'Subject deleted successfully' };
  }
}
