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
exports.QuestionsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const uuid_1 = require("uuid");
const questions_service_js_1 = require("./questions.service.js");
const index_js_1 = require("../auth/guards/index.js");
const index_js_2 = require("../auth/decorators/index.js");
const client_1 = require("@prisma/client");
const index_js_3 = require("./dto/index.js");
const uploadDir = process.env.UPLOAD_DIR || '../uploads';
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const imageStorage = (0, multer_1.diskStorage)({
    destination: (0, path_1.join)(process.cwd(), uploadDir, 'question-images'),
    filename: (_req, file, callback) => {
        const ext = (0, path_1.extname)(file.originalname).toLowerCase();
        if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
            return callback(new Error(`Image type ${ext} is not allowed. Allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`), '');
        }
        const uniqueName = `${(0, uuid_1.v4)()}${ext}`;
        callback(null, uniqueName);
    },
});
const imageMulterOptions = {
    storage: imageStorage,
    limits: { fileSize: MAX_IMAGE_SIZE },
    fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
            return callback(new common_1.BadRequestException('Only image files are allowed'), false);
        }
        callback(null, true);
    },
};
let QuestionsController = class QuestionsController {
    questionsService;
    constructor(questionsService) {
        this.questionsService = questionsService;
    }
    async create(dto, userId, userRole, image) {
        const imagePath = image ? image.path : undefined;
        return this.questionsService.create(dto, userId, userRole, imagePath);
    }
    async findAll(userId, userRole, page, limit, subjectId, status, search, mine) {
        const filters = {};
        if (subjectId)
            filters.subjectId = subjectId;
        if (search)
            filters.search = search;
        if (userRole === client_1.Role.ADMIN || userRole === client_1.Role.TEACHER) {
            if (status)
                filters.status = status;
        }
        else {
            if (mine === 'true') {
                filters.createdById = userId;
                if (status)
                    filters.status = status;
            }
            else {
                filters.status = client_1.QuestionStatus.APPROVED;
            }
        }
        return this.questionsService.findAll(page, limit, filters);
    }
    async getCounts(subjectId) {
        return this.questionsService.getStatusCounts(subjectId);
    }
    async getSubjectCounts() {
        return this.questionsService.getSubjectCounts();
    }
    async findOne(id) {
        return this.questionsService.findOne(id);
    }
    async update(id, dto, userId, userRole, image) {
        const imagePath = image ? image.path : undefined;
        return this.questionsService.update(id, dto, userId, userRole, imagePath);
    }
    async remove(id, userId, userRole) {
        return this.questionsService.remove(id, userId, userRole);
    }
    async review(id, dto) {
        return this.questionsService.review(id, dto.status);
    }
    async generateQuiz(dto) {
        return this.questionsService.generateQuizFromQA(dto);
    }
};
exports.QuestionsController = QuestionsController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', imageMulterOptions)),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __param(2, (0, index_js_2.CurrentUser)('role')),
    __param(3, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_3.CreateQuestionDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, index_js_2.CurrentUser)('id')),
    __param(1, (0, index_js_2.CurrentUser)('role')),
    __param(2, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(3, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(4, (0, common_1.Query)('subjectId')),
    __param(5, (0, common_1.Query)('status')),
    __param(6, (0, common_1.Query)('search')),
    __param(7, (0, common_1.Query)('mine')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Number, Number, String, String, String, String]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('counts'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Query)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "getCounts", null);
__decorate([
    (0, common_1.Get)('subject-counts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "getSubjectCounts", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('image', imageMulterOptions)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, index_js_2.CurrentUser)('id')),
    __param(3, (0, index_js_2.CurrentUser)('role')),
    __param(4, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_3.UpdateQuestionDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __param(2, (0, index_js_2.CurrentUser)('role')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "remove", null);
__decorate([
    (0, common_1.Patch)(':id/review'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_3.ReviewQuestionDto]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "review", null);
__decorate([
    (0, common_1.Post)('generate-quiz'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN, client_1.Role.TEACHER),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_3.GenerateQuizFromQADto]),
    __metadata("design:returntype", Promise)
], QuestionsController.prototype, "generateQuiz", null);
exports.QuestionsController = QuestionsController = __decorate([
    (0, common_1.Controller)('questions'),
    (0, common_1.UseGuards)(index_js_1.JwtAuthGuard, index_js_1.RolesGuard),
    __metadata("design:paramtypes", [questions_service_js_1.QuestionsService])
], QuestionsController);
//# sourceMappingURL=questions.controller.js.map