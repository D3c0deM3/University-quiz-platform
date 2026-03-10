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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureFilesController = void 0;
const common_1 = require("@nestjs/common");
const index_js_1 = require("../auth/guards/index.js");
const index_js_2 = require("../auth/decorators/index.js");
const client_1 = require("@prisma/client");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const fs_1 = require("fs");
const path_1 = require("path");
const uploadDir = process.env.UPLOAD_DIR || '../uploads';
const resolvedUploadDir = (0, path_1.isAbsolute)(uploadDir) ? uploadDir : (0, path_1.join)(process.cwd(), uploadDir);
let SecureFilesController = class SecureFilesController {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async downloadFile(materialId, userId, role, res) {
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
            throw new common_1.NotFoundException('Material not found');
        }
        if (role === client_1.Role.STUDENT) {
            if (material.status !== client_1.MaterialStatus.PUBLISHED) {
                throw new common_1.ForbiddenException('This material is not available');
            }
            const sub = await this.prisma.userSubscription.findFirst({
                where: {
                    userId,
                    subjectId: material.subjectId,
                    status: client_1.SubscriptionStatus.ACTIVE,
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } },
                    ],
                },
            });
            if (!sub) {
                throw new common_1.ForbiddenException('You do not have a subscription for this subject');
            }
        }
        const filePath = (0, path_1.isAbsolute)(material.filePath)
            ? material.filePath
            : (0, path_1.join)(resolvedUploadDir, material.fileName);
        if (!(0, fs_1.existsSync)(filePath)) {
            throw new common_1.NotFoundException('File not found on disk');
        }
        res.setHeader('Content-Disposition', `inline; filename="${material.originalName}"`);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.sendFile(filePath);
    }
};
exports.SecureFilesController = SecureFilesController;
__decorate([
    (0, common_1.Get)(':id/download'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __param(2, (0, index_js_2.CurrentUser)('role')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], SecureFilesController.prototype, "downloadFile", null);
exports.SecureFilesController = SecureFilesController = __decorate([
    (0, common_1.Controller)('materials'),
    (0, common_1.UseGuards)(index_js_1.JwtAuthGuard, index_js_1.RolesGuard),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], SecureFilesController);
//# sourceMappingURL=secure-files.controller.js.map