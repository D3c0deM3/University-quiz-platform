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
exports.QuizzesController = void 0;
const common_1 = require("@nestjs/common");
const quizzes_service_js_1 = require("./quizzes.service.js");
const index_js_1 = require("../auth/guards/index.js");
const index_js_2 = require("../auth/decorators/index.js");
const submit_quiz_dto_js_1 = require("./dto/submit-quiz.dto.js");
let QuizzesController = class QuizzesController {
    quizzesService;
    constructor(quizzesService) {
        this.quizzesService = quizzesService;
    }
    async findBySubject(subjectId, page, limit) {
        return this.quizzesService.findBySubject(subjectId, page, limit);
    }
    async findOne(quizId) {
        return this.quizzesService.findOne(quizId);
    }
    async startAttempt(quizId, userId) {
        return this.quizzesService.startAttempt(quizId, userId);
    }
    async submitAttempt(attemptId, userId, dto) {
        return this.quizzesService.submitAttempt(attemptId, userId, dto);
    }
    async getAttemptResults(attemptId, userId) {
        return this.quizzesService.getAttemptResults(attemptId, userId);
    }
    async getMyAttempts(userId, page, limit) {
        return this.quizzesService.getMyAttempts(userId, page, limit);
    }
    async getMyAttemptDetail(attemptId, userId) {
        return this.quizzesService.getAttemptResults(attemptId, userId);
    }
    async getMyStats(userId) {
        return this.quizzesService.getMyStats(userId);
    }
};
exports.QuizzesController = QuizzesController;
__decorate([
    (0, common_1.Get)('subjects/:id/quizzes'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "findBySubject", null);
__decorate([
    (0, common_1.Get)('quizzes/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)('quizzes/:id/attempts'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "startAttempt", null);
__decorate([
    (0, common_1.Post)('quiz-attempts/:id/submit'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, submit_quiz_dto_js_1.SubmitQuizDto]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "submitAttempt", null);
__decorate([
    (0, common_1.Get)('quiz-attempts/:id/results'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "getAttemptResults", null);
__decorate([
    (0, common_1.Get)('my/quiz-attempts'),
    __param(0, (0, index_js_2.CurrentUser)('id')),
    __param(1, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "getMyAttempts", null);
__decorate([
    (0, common_1.Get)('my/quiz-attempts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, index_js_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "getMyAttemptDetail", null);
__decorate([
    (0, common_1.Get)('my/quiz-stats'),
    __param(0, (0, index_js_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QuizzesController.prototype, "getMyStats", null);
exports.QuizzesController = QuizzesController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(index_js_1.JwtAuthGuard, index_js_1.RolesGuard),
    __metadata("design:paramtypes", [quizzes_service_js_1.QuizzesService])
], QuizzesController);
//# sourceMappingURL=quizzes.controller.js.map