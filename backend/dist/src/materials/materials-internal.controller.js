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
exports.MaterialsInternalController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const class_validator_1 = require("class-validator");
const materials_service_js_1 = require("./materials.service.js");
class UpdateProcessingProgressDto {
    materialId;
    progress;
    stage;
}
__decorate([
    (0, class_validator_1.IsUUID)(),
    __metadata("design:type", String)
], UpdateProcessingProgressDto.prototype, "materialId", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], UpdateProcessingProgressDto.prototype, "progress", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], UpdateProcessingProgressDto.prototype, "stage", void 0);
let MaterialsInternalController = class MaterialsInternalController {
    materialsService;
    configService;
    constructor(materialsService, configService) {
        this.materialsService = materialsService;
        this.configService = configService;
    }
    async updateProgress(body, key) {
        const configuredKey = this.configService.get('INTERNAL_PROCESSING_KEY', 'local-processing-key');
        if (!key || key !== configuredKey) {
            throw new common_1.UnauthorizedException('Invalid processing key');
        }
        return this.materialsService.updateProcessingProgress(body.materialId, body.progress, body.stage);
    }
};
exports.MaterialsInternalController = MaterialsInternalController;
__decorate([
    (0, common_1.Post)('progress'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-processing-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [UpdateProcessingProgressDto, String]),
    __metadata("design:returntype", Promise)
], MaterialsInternalController.prototype, "updateProgress", null);
exports.MaterialsInternalController = MaterialsInternalController = __decorate([
    (0, common_1.Controller)('materials/internal'),
    __metadata("design:paramtypes", [materials_service_js_1.MaterialsService,
        config_1.ConfigService])
], MaterialsInternalController);
//# sourceMappingURL=materials-internal.controller.js.map