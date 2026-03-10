import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/index.js';
import { CurrentUser } from '../auth/decorators/index.js';
import { Role, MaterialStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { existsSync } from 'fs';
import { join, isAbsolute } from 'path';

const uploadDir = process.env.UPLOAD_DIR || '../uploads';
const resolvedUploadDir = isAbsolute(uploadDir) ? uploadDir : join(process.cwd(), uploadDir);

/**
 * Serves material files through authentication + subscription checks.
 * Paid/premium files MUST be accessed through this controller, not via static /uploads/.
 *
 * Route: GET /api/materials/:id/download
 */
@Controller('materials')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SecureFilesController {
  constructor(private prisma: PrismaService) {}

  @Get(':id/download')
  async downloadFile(
    @Param('id') materialId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('role') role: string,
    @Res() res: any,
  ) {
    const material = await this.prisma.material.findUnique({
      where: { id: materialId },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        filePath: true,
        fileType: true,
        status: true,
        subjectId: true,
      },
    });

    if (!material) {
      throw new NotFoundException('Material not found');
    }

    // Admin/Teacher can always download
    if (role === Role.STUDENT) {
      // Students can only download PUBLISHED materials
      if (material.status !== MaterialStatus.PUBLISHED) {
        throw new ForbiddenException('This material is not available');
      }

      // Check subscription
      const sub = await this.prisma.userSubscription.findFirst({
        where: {
          userId,
          subjectId: material.subjectId,
          status: SubscriptionStatus.ACTIVE,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } },
          ],
        },
      });

      if (!sub) {
        throw new ForbiddenException(
          'You do not have a subscription for this subject',
        );
      }
    }

    // Determine the actual file path
    const filePath = isAbsolute(material.filePath)
      ? material.filePath
      : join(resolvedUploadDir, material.fileName);

    if (!existsSync(filePath)) {
      throw new NotFoundException('File not found on disk');
    }

    // Set headers to prevent caching and encourage non-downloadable viewing
    (res as Response).setHeader('Content-Disposition', `inline; filename="${material.originalName}"`);
    (res as Response).setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    (res as Response).setHeader('Pragma', 'no-cache');
    (res as Response).setHeader('X-Content-Type-Options', 'nosniff');

    // Serve the file
    (res as Response).sendFile(filePath);
  }
}
