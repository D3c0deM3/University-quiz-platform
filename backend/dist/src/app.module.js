"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const bullmq_1 = require("@nestjs/bullmq");
const throttler_1 = require("@nestjs/throttler");
const core_1 = require("@nestjs/core");
const app_controller_js_1 = require("./app.controller.js");
const app_service_js_1 = require("./app.service.js");
const python_service_manager_js_1 = require("./python-service-manager.js");
const prisma_module_js_1 = require("./prisma/prisma.module.js");
const auth_module_js_1 = require("./auth/auth.module.js");
const users_module_js_1 = require("./users/users.module.js");
const subjects_module_js_1 = require("./subjects/subjects.module.js");
const materials_module_js_1 = require("./materials/materials.module.js");
const search_module_js_1 = require("./search/search.module.js");
const quizzes_module_js_1 = require("./quizzes/quizzes.module.js");
const questions_module_js_1 = require("./questions/questions.module.js");
const subscriptions_module_js_1 = require("./subscriptions/subscriptions.module.js");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot({
                throttlers: [
                    {
                        name: 'default',
                        ttl: 60000,
                        limit: 100,
                    },
                ],
            }),
            bullmq_1.BullModule.forRootAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    connection: {
                        host: config.get('REDIS_HOST', 'localhost'),
                        port: config.get('REDIS_PORT', 6379),
                    },
                }),
            }),
            prisma_module_js_1.PrismaModule,
            auth_module_js_1.AuthModule,
            users_module_js_1.UsersModule,
            subjects_module_js_1.SubjectsModule,
            materials_module_js_1.MaterialsModule,
            search_module_js_1.SearchModule,
            quizzes_module_js_1.QuizzesModule,
            questions_module_js_1.QuestionsModule,
            subscriptions_module_js_1.SubscriptionsModule,
        ],
        controllers: [app_controller_js_1.AppController],
        providers: [
            app_service_js_1.AppService,
            python_service_manager_js_1.PythonServiceManager,
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map