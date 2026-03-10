"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterialsModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const materials_service_js_1 = require("./materials.service.js");
const materials_controller_js_1 = require("./materials.controller.js");
const secure_files_controller_js_1 = require("./secure-files.controller.js");
const material_processing_processor_js_1 = require("./processors/material-processing.processor.js");
const subscriptions_module_js_1 = require("../subscriptions/subscriptions.module.js");
let MaterialsModule = class MaterialsModule {
};
exports.MaterialsModule = MaterialsModule;
exports.MaterialsModule = MaterialsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'material-processing',
            }),
            subscriptions_module_js_1.SubscriptionsModule,
        ],
        controllers: [materials_controller_js_1.MaterialsController, secure_files_controller_js_1.SecureFilesController],
        providers: [materials_service_js_1.MaterialsService, material_processing_processor_js_1.MaterialProcessingProcessor],
        exports: [materials_service_js_1.MaterialsService],
    })
], MaterialsModule);
//# sourceMappingURL=materials.module.js.map