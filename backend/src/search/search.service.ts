import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MaterialStatus, DifficultyLevel } from '@prisma/client';
import { SearchQueryDto, SearchSortBy } from './dto/search-query.dto.js';

@Injectable()
export class SearchService {
  constructor(private prisma: PrismaService) {}

  async search(dto: SearchQueryDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build WHERE conditions
    const conditions: string[] = ['m."status" = \'PUBLISHED\''];
    const params: any[] = [];
    let paramIndex = 1;

    // Full-text search on title + summary
    if (dto.q && dto.q.trim()) {
      const searchTerms = dto.q
        .trim()
        .split(/\s+/)
        .map((t) => t.replace(/[^\w\u0400-\u04FF]/g, '')) // allow cyrillic too
        .filter(Boolean)
        .map((t) => `${t}:*`)
        .join(' & ');

      conditions.push(
        `(
          to_tsvector('simple', coalesce(mm."title", '') || ' ' || coalesce(mm."summary", ''))
          @@ to_tsquery('simple', $${paramIndex})
          OR mm."title" ILIKE $${paramIndex + 1}
          OR mm."summary" ILIKE $${paramIndex + 1}
        )`,
      );
      params.push(searchTerms, `%${dto.q.trim()}%`);
      paramIndex += 2;
    }

    // Filter by subject (id or name)
    if (dto.subject) {
      conditions.push(
        `(s."id" = $${paramIndex} OR s."name" ILIKE $${paramIndex + 1})`,
      );
      params.push(dto.subject, `%${dto.subject}%`);
      paramIndex += 2;
    }

    // Filter by tags (comma-separated, any match)
    if (dto.tags) {
      const tagList = dto.tags.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
      if (tagList.length > 0) {
        // Use array overlap for GIN-indexed arrays
        conditions.push(`mm."tags" && $${paramIndex}::text[]`);
        params.push(tagList);
        paramIndex++;
      }
    }

    // Filter by topic
    if (dto.topic) {
      conditions.push(`mm."topics" && $${paramIndex}::text[]`);
      params.push([dto.topic.trim()]);
      paramIndex++;
    }

    // Filter by file type
    if (dto.type) {
      conditions.push(`m."file_type" = $${paramIndex}`);
      params.push(dto.type.toUpperCase());
      paramIndex++;
    }

    // Filter by difficulty
    if (dto.difficulty) {
      const dl = dto.difficulty.toUpperCase();
      if (['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].includes(dl)) {
        conditions.push(`mm."difficulty_level" = $${paramIndex}::"DifficultyLevel"`);
        params.push(dl);
        paramIndex++;
      }
    }

    // Filter by date range
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

    // Build ORDER BY
    let orderBy: string;
    const sortOrder = dto.order === 'asc' ? 'ASC' : 'DESC';

    if (dto.sort === SearchSortBy.TITLE) {
      orderBy = `mm."title" ${sortOrder} NULLS LAST`;
    } else if (dto.sort === SearchSortBy.DATE) {
      orderBy = `m."created_at" ${sortOrder}`;
    } else {
      // Relevance — use ts_rank if there's a search query, otherwise date
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
      } else {
        orderBy = `m."created_at" DESC`;
      }
    }

    // Count query
    const countQuery = `
      SELECT COUNT(*)::int as total
      FROM "materials" m
      LEFT JOIN "material_metadata" mm ON mm."material_id" = m."id"
      LEFT JOIN "subjects" s ON s."id" = m."subject_id"
      WHERE ${whereClause}
    `;

    // Data query
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

    // Execute both queries
    const [countResult, data] = await Promise.all([
      this.prisma.$queryRawUnsafe<[{ total: number }]>(countQuery, ...params),
      this.prisma.$queryRawUnsafe<any[]>(dataQuery, ...params),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: data.map((row: any) => ({
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

  /**
   * Deep search across text chunks for more thorough results.
   */
  async deepSearch(query: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    if (!query || !query.trim()) {
      return { data: [], meta: { total: 0, page, limit, totalPages: 0 } };
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
      ORDER BY m."id", rank DESC
      LIMIT $2 OFFSET $3
    `;

    const [countResult, data] = await Promise.all([
      this.prisma.$queryRawUnsafe<[{ total: number }]>(countQuery, searchTerms),
      this.prisma.$queryRawUnsafe<any[]>(dataQuery, searchTerms, limit, skip),
    ]);

    const total = countResult[0]?.total ?? 0;

    return {
      data: data.map((row: any) => ({
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
}
