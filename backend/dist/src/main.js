"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const path_1 = require("path");
const app_module_js_1 = require("./app.module.js");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule);
    app.setGlobalPrefix('api');
    app.use((0, cookie_parser_1.default)());
    const uploadDir = process.env.UPLOAD_DIR || '../uploads';
    app.useStaticAssets((0, path_1.join)(process.cwd(), uploadDir), {
        prefix: '/uploads/',
    });
    app.use((0, helmet_1.default)());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const envOrigins = (process.env.FRONTEND_URL ?? '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/$/, ''))
        .filter(Boolean);
    const allowedOrigins = Array.from(new Set(['http://localhost:3001', 'https://unitest.systems', ...envOrigins]));
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            const normalizedOrigin = origin.replace(/\/$/, '');
            if (allowedOrigins.includes(normalizedOrigin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        maxAge: 86400,
    });
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`🚀 Backend running on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map