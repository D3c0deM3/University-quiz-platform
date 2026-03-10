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
exports.SearchService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const client_1 = require("@prisma/client");
const search_query_dto_js_1 = require("./dto/search-query.dto.js");
let SearchService = class SearchService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getSubscribedSubjectIds(userId) {
        const subs = await this.prisma.userSubscription.findMany({
            where: {
                userId,
                status: client_1.SubscriptionStatus.ACTIVE,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } },
                ],
            },
            select: { subjectId: true },
        });
        return subs.map((s) => s.subjectId);
    }
    async search(dto, userId, role) {
        const page = dto.page ?? 1;
        const limit = dto.limit ?? 20;
        const skip = (page - 1) * limit;
        const conditions = ['m."status" = \'PUBLISHED\''];
        const params = [];
        let paramIndex = 1;
        if (role === client_1.Role.STUDENT) {
            const subjectIds = await this.getSubscribedSubjectIds(userId);
            if (subjectIds.length === 0) {
                return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
            }
            conditions.push(`m."subject_id" = ANY($${paramIndex}::text[])`);
            params.push(subjectIds);
            paramIndex++;
        }
        if (dto.q && dto.q.trim()) {
            const searchTerms = dto.q
                .trim()
                .split(/\s+/)
                .map((t) => t.replace(/[^\w\u0400-\u04FF]/g, ''))
                .filter(Boolean)
                .map((t) => `${t}:*`)
                .join(' & ');
            conditions.push(`(
          to_tsvector('simple', coalesce(mm."title", '') || ' ' || coalesce(mm."summary", ''))
          @@ to_tsquery('simple', $${paramIndex})
          OR mm."title" ILIKE $${paramIndex + 1}
          OR mm."summary" ILIKE $${paramIndex + 1}
        )`);
            params.push(searchTerms, `%${dto.q.trim()}%`);
            paramIndex += 2;
        }
        if (dto.subject) {
            conditions.push(`(s."id" = $${paramIndex} OR s."name" ILIKE $${paramIndex + 1})`);
            params.push(dto.subject, `%${dto.subject}%`);
            paramIndex += 2;
        }
        if (dto.tags) {
            const tagList = dto.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
            if (tagList.length > 0) {
                conditions.push(`mm."tags" && $${paramIndex}::text[]`);
                params.push(tagList);
                paramIndex++;
            }
        }
        if (dto.topic) {
            conditions.push(`mm."topics" && $${paramIndex}::text[]`);
            params.push([dto.topic.trim()]);
            paramIndex++;
        }
        if (dto.type) {
            conditions.push(`m."file_type" = $${paramIndex}`);
            params.push(dto.type.toUpperCase());
            paramIndex++;
        }
        if (dto.difficulty) {
            const dl = dto.difficulty.toUpperCase();
            if (['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(dl)) {
                conditions.push(`mm."difficulty_level" = $${paramIndex}::"DifficultyLevel"`);
                params.push(dl);
                paramIndex++;
            }
        }
        if (dto.dateFrom) {
            conditions.push(`m."created_at" >= $${paramIndex}::timestamp`);
            params.push(dto.dateFrom);
            paramIndex++;
        }
        if (dto.dateTo) {
            conditions.push(`m."created_at" <= $${paramIndex}::timestamp`);
            params.push(dto.dateTo);
            paramIndex++;
        }
        const whereClause = conditions.join(' AND ');
        let orderBy;
        const sortOrder = dto.order === 'asc' ? 'ASC' : 'DESC';
        if (dto.sort === search_query_dto_js_1.SearchSortBy.TITLE) {
            orderBy = `mm."title" ${sortOrder} NULLS LAST`;
        }
        else if (dto.sort === search_query_dto_js_1.SearchSortBy.DATE) {
            orderBy = `m."created_at" ${sortOrder}`;
        }
        else {
            if (dto.q && dto.q.trim()) {
                const searchTerms = dto.q
                    .trim()
                    .split(/\s+/)
                    .map((t) => t.replace(/[^\w\u0400-\u04FF]/g, ''))
                    .filter(Boolean)
                    .map((t) => `${t}:*`)
                    .join(' & ');
                orderBy = `ts_rank(
          to_tsvector('simple', coalesce(mm."title", '') || ' ' || coalesce(mm."summary", '')),
          to_tsquery('simple', '${searchTerms.replace(/'/g, "''")}')
        ) DESC, m."created_at" DESC`;
            }
            else {
                orderBy = `m."created_at" DESC`;
            }
        }
        const countQuery = `
      SELECT COUNT(*)::int as total
      FROM "materials" m
      LEFT JOIN "material_metadata" mm ON mm."material_id" = m."id"
      LEFT JOIN "subjects" s ON s."id" = m."subject_id"
      WHERE ${whereClause}
    `;
        const dataQuery = `
      SELECT
        m."id",
        m."file_type" as "fileType",
        m."original_name" as "originalName",
        m."file_size" as "fileSize",
        m."created_at" as "createdAt",
        mm."title",
        mm."summary",
        mm."keywords",
        mm."topics",
        mm."tags",
        mm."difficulty_level" as "difficultyLevel",
        mm."content_type" as "contentType",
        s."id" as "subjectId",
        s."name" as "subjectName",
        u."first_name" as "uploaderFirstName",
        u."last_name" as "uploaderLastName"
      FROM "materials" m
      LEFT JOIN "material_metadata" mm ON mm."material_id" = m."id"
      LEFT JOIN "subjects" s ON s."id" = m."subject_id"
      LEFT JOIN "users" u ON u."id" = m."uploaded_by_id"
      WHERE ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ${limit} OFFSET ${skip}
    `;
        const [countResult, data] = await Promise.all([
            this.prisma.$queryRawUnsafe(countQuery, ...params),
            this.prisma.$queryRawUnsafe(dataQuery, ...params),
        ]);
        const total = countResult[0]?.total ?? 0;
        return {
            data: data.map((row) => ({
                id: row.id,
                title: row.title,
                summary: row.summary,
                keywords: row.keywords || [],
                topics: row.topics || [],
                tags: row.tags || [],
                difficultyLevel: row.difficultyLevel,
                contentType: row.contentType,
                fileType: row.fileType,
                originalName: row.originalName,
                fileSize: row.fileSize,
                createdAt: row.createdAt,
                subject: {
                    id: row.subjectId,
                    name: row.subjectName,
                },
                uploader: {
                    firstName: row.uploaderFirstName,
                    lastName: row.uploaderLastName,
                },
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    async deepSearch(query, userId, role, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        if (!query || !query.trim()) {
            return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
        }
        let countSubjectFilter = '';
        let dataSubjectFilter = '';
        const extraParams = [];
        if (role === client_1.Role.STUDENT) {
            const subjectIds = await this.getSubscribedSubjectIds(userId);
            if (subjectIds.length === 0) {
                return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
            }
            countSubjectFilter = `AND m."subject_id" = ANY($2::text[])`;
            dataSubjectFilter = `AND m."subject_id" = ANY($4::text[])`;
            extraParams.push(subjectIds);
        }
        const searchTerms = query
            .trim()
            .split(/\s+/)
            .map((t) => t.replace(/[^\w\u0400-\u04FF]/g, ''))
            .filter(Boolean)
            .map((t) => `${t}:*`)
            .join(' & ');
        const countQuery = `
      SELECT COUNT(DISTINCT m."id")::int as total
      FROM "materials" m
      JOIN "material_text_chunks" tc ON tc."material_id" = m."id"
      WHERE m."status" = 'PUBLISHED'
        AND to_tsvector('simple', tc."content") @@ to_tsquery('simple', $1)
        ${countSubjectFilter}
    `;
        const dataQuery = `
      SELECT DISTINCT ON (m."id")
        m."id",
        m."file_type" as "fileType",
        m."original_name" as "originalName",
        m."created_at" as "createdAt",
        mm."title",
        mm."summary",
        mm."keywords",
        mm."tags",
        s."name" as "subjectName",
        ts_rank(to_tsvector('simple', tc."content"), to_tsquery('simple', $1)) as rank
      FROM "materials" m
      JOIN "material_text_chunks" tc ON tc."material_id" = m."id"
      LEFT JOIN "material_metadata" mm ON mm."material_id" = m."id"
      LEFT JOIN "subjects" s ON s."id" = m."subject_id"
      WHERE m."status" = 'PUBLISHED'
        AND to_tsvector('simple', tc."content") @@ to_tsquery('simple', $1)
        ${dataSubjectFilter}
      ORDER BY m."id", rank DESC
      LIMIT $2 OFFSET $3
    `;
        const countParams = [searchTerms, ...extraParams];
        const dataParams = [searchTerms, limit, skip, ...extraParams];
        const [countResult, data] = await Promise.all([
            this.prisma.$queryRawUnsafe(countQuery, ...countParams),
            this.prisma.$queryRawUnsafe(dataQuery, ...dataParams),
        ]);
        const total = countResult[0]?.total ?? 0;
        return {
            data: data.map((row) => ({
                id: row.id,
                title: row.title,
                summary: row.summary,
                keywords: row.keywords || [],
                tags: row.tags || [],
                fileType: row.fileType,
                originalName: row.originalName,
                createdAt: row.createdAt,
                subjectName: row.subjectName,
                relevance: row.rank,
            })),
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
};
exports.SearchService = SearchService;
exports.SearchService = SearchService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], SearchService);
//# sourceMappingURL=search.service.js.map