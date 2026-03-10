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
exports.MaterialsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const materials_service_js_1 = require("./materials.service.js");
const index_js_1 = require("../auth/guards/index.js");
const index_js_2 = require("../auth/decorators/index.js");
const client_1 = require("@prisma/client");
const common_2 = require("@nestjs/common");
const subscriptions_service_js_1 = require("../subscriptions/subscriptions.service.js");
const update_metadata_dto_js_1 = require("./dto/update-metadata.dto.js");
const update_quiz_dto_js_1 = require("./dto/update-quiz.dto.js");
const quiz_question_dto_js_1 = require("./dto/quiz-question.dto.js");
const uploadDir = process.env.UPLOAD_DIR || '../uploads';
const resolvedUploadDir = (0, path_1.isAbsolute)(uploadDir) ? uploadDir : (0, path_1.join)(process.cwd(), uploadDir);
const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const storage = (0, multer_1.diskStorage)({
    destination: resolvedUploadDir,
    filename: (_req, file, callback) => {
        const ext = (0, path_1.extname)(file.originalname).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            return callback(new Error(`File type ${ext} is not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`), '');
        }
        const uniqueName = `${(0, uuid_1.v4)()}${ext}`;
        callback(null, uniqueName);
    },
});
const multerOptions = {
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
};
let MaterialsController = class MaterialsController {
    materialsService;
    processingQueue;
    subscriptionsService;
    constructor(materialsService, processingQueue, subscriptionsService) {
        this.materialsService = materialsService;
        this.processingQueue = processingQueue;
        this.subscriptionsService = subscriptionsService;
    }
    async upload(file, subjectId, numQuestionsRaw, userId) {
        if (!file) {
            throw new common_1.BadRequestException('File is required');
        }
        if (!subjectId) {
            throw new common_1.BadRequestException('subjectId is required');
        }
        const numQuestions = Math.max(parseInt(numQuestionsRaw, 10) || 10, 1);
        const material = await this.materialsService.upload(file, subjectId, userId);
        await this.processingQueue.add('process', {
            materialId: material.id,
            filePath: material.filePath,
            fileType: material.fileType,
            originalName: material.originalName,
            numQuestions,
            uploadedById: userId,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
        return {
            message: 'Material uploaded successfully. Processing will begin shortly.',
            material,
        };
    }
    async findAll(page, limit, status, subjectId, userId, role) {
        if (role === client_1.Role.STUDENT && subjectId) {
            const hasAccess = await this.subscriptionsService.hasAccess(userId, subjectId);
            if (!hasAccess)
                throw new common_2.ForbiddenException('You do not have a subscription for this subject');
        }
        return this.materialsService.findAll(page, limit, status, subjectId);
    }
    async findOne(id, userId, role) {
        const material = await this.materialsService.findOne(id);
        if (role === client_1.Role.STUDENT && material.subjectId) {
            const hasAccess = await this.subscriptionsService.hasAccess(userId, material.subjectId);
            if (!hasAccess)
                throw new common_2.ForbiddenException('You do not have a subscription for this subject');
        }
        return material;
    }
    async remove(id) {
        return this.materialsService.remove(id);
    }
    async getMetadata(id) {
        return this.materialsService.getMetadata(id);
    }
    async updateMetadata(id, dto) {
        return this.materialsService.updateMetadata(id, dto);
    }
    async getQuizzes(id) {
        return this.materialsService.getQuizzes(id);
    }
    async updateQuiz(quizId, dto) {
        return this.materialsService.updateQuiz(quizId, dto);
    }
    async deleteQuiz(quizId) {
        return this.materialsService.deleteQuiz(quizId);
    }
    async reviewMaterial(id, body) {
        if (!body.action || !['approve', 'reject'].includes(body.action)) {
            throw new common_1.BadRequestException('Action must be "approve" or "reject"');
        }
        return this.materialsService.reviewMaterial(id, body.action, body.reason);
    }
    async publishMaterial(id, body) {
        if (body.publish === undefined) {
            throw new common_1.BadRequestException('publish field is required (true/false)');
        }
        return this.materialsService.publishMaterial(id, body.publish);
    }
    async reprocessMaterial(id, userId) {
        const material = await this.materialsService.reprocessMaterial(id);
        await this.processingQueue.add('process', {
            materialId: material.id,
            filePath: material.filePath,
            fileType: material.fileType,
            originalName: material.originalName,
        }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
        });
        return {
            message: 'Material queued for reprocessing',
            material,
        };
    }
    async createQuizQuestion(dto) {
        return this.materialsService.createQuizQuestion(dto);
    }
    async updateQuizQuestion(questionId, dto) {
        return this.materialsService.updateQuizQuestion(questionId, dto);
    }
    async deleteQuizQuestion(questionId) {
        return this.materialsService.deleteQuizQuestion(questionId);
    }
    async changeStatus(id, body) {
        if (!body.status || !Object.values(client_1.MaterialStatus).includes(body.status)) {
            throw new common_1.BadRequestException(`Invalid status. Must be one of: ${Object.values(client_1.MaterialStatus).join(', ')}`);
        }
        return this.materialsService.changeStatus(id, body.status);
    }
};
exports.MaterialsController = MaterialsController;
__decorate([
    (0, common_1.Post)('upload'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', multerOptions)),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Body)('subjectId')),
    __param(2, (0, common_1.Body)('numQuestions')),
    __param(3, (0, index_js_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "upload", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('subjectId')),
    __param(4, (0, index_js_2.CurrentUser)('id')),
    __param(5, (0, index_js_2.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __param(2, (0, index_js_2.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(':id/metadata'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "getMetadata", null);
__decorate([
    (0, common_1.Put)(':id/metadata'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_metadata_dto_js_1.UpdateMetadataDto]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "updateMetadata", null);
__decorate([
    (0, common_1.Get)(':id/quizzes'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "getQuizzes", null);
__decorate([
    (0, common_1.Put)('quizzes/:quizId'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('quizId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_quiz_dto_js_1.UpdateQuizDto]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "updateQuiz", null);
__decorate([
    (0, common_1.Delete)('quizzes/:quizId'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('quizId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "deleteQuiz", null);
__decorate([
    (0, common_1.Patch)(':id/review'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "reviewMaterial", null);
__decorate([
    (0, common_1.Patch)(':id/publish'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "publishMaterial", null);
__decorate([
    (0, common_1.Post)(':id/reprocess'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "reprocessMaterial", null);
__decorate([
    (0, common_1.Post)('quiz-questions'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [quiz_question_dto_js_1.CreateQuizQuestionDto]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "createQuizQuestion", null);
__decorate([
    (0, common_1.Put)('quiz-questions/:questionId'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('questionId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, quiz_question_dto_js_1.UpdateSingleQuestionDto]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "updateQuizQuestion", null);
__decorate([
    (0, common_1.Delete)('quiz-questions/:questionId'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('questionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "deleteQuizQuestion", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MaterialsController.prototype, "changeStatus", null);
exports.MaterialsController = MaterialsController = __decorate([
    (0, common_1.Controller)('materials'),
    (0, common_1.UseGuards)(index_js_1.JwtAuthGuard, index_js_1.RolesGuard),
    __param(1, (0, bullmq_1.InjectQueue)('material-processing')),
    __metadata("design:paramtypes", [materials_service_js_1.MaterialsService,
        bullmq_2.Queue,
        subscriptions_service_js_1.SubscriptionsService])
], MaterialsController);
//# sourceMappingURL=materials.controller.js.map