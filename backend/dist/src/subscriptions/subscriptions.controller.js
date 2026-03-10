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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_js_1 = require("./subscriptions.service.js");
const index_js_1 = require("../auth/guards/index.js");
const index_js_2 = require("../auth/decorators/index.js");
const client_1 = require("@prisma/client");
const index_js_3 = require("./dto/index.js");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async assign(dto) {
        return this.subscriptionsService.assign(dto);
    }
    async bulkAssign(dto) {
        return this.subscriptionsService.bulkAssign(dto);
    }
    async findAll(page, limit, userId, subjectId, status) {
        return this.subscriptionsService.findAll(page, limit, userId, subjectId, status);
    }
    async findByUser(userId) {
        return this.subscriptionsService.findByUser(userId);
    }
    async getMySubscriptions(userId) {
        return this.subscriptionsService.getMySubscriptions(userId);
    }
    async checkAccess(userId, role, subjectId) {
        if (role === client_1.Role.ADMIN || role === client_1.Role.TEACHER) {
            return { hasAccess: true };
        }
        const hasAccess = await this.subscriptionsService.hasAccess(userId, subjectId);
        return { hasAccess };
    }
    async update(id, dto) {
        return this.subscriptionsService.update(id, dto);
    }
    async revoke(id) {
        return this.subscriptionsService.revoke(id);
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)('assign'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_3.AssignSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "assign", null);
__decorate([
    (0, common_1.Post)('bulk-assign'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_3.BulkAssignDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "bulkAssign", null);
__decorate([
    (0, common_1.Get)(),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Query)('page', new common_1.DefaultValuePipe(1), common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('limit', new common_1.DefaultValuePipe(20), common_1.ParseIntPipe)),
    __param(2, (0, common_1.Query)('userId')),
    __param(3, (0, common_1.Query)('subjectId')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number, String, String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "findByUser", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, index_js_2.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMySubscriptions", null);
__decorate([
    (0, common_1.Get)('check/:subjectId'),
    __param(0, (0, index_js_2.CurrentUser)('id')),
    __param(1, (0, index_js_2.CurrentUser)('role')),
    __param(2, (0, common_1.Param)('subjectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "checkAccess", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, index_js_3.UpdateSubscriptionDto]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, index_js_2.Roles)(client_1.Role.ADMIN),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "revoke", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, common_1.Controller)('subscriptions'),
    (0, common_1.UseGuards)(index_js_1.JwtAuthGuard, index_js_1.RolesGuard),
    __metadata("design:paramtypes", [subscriptions_service_js_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map