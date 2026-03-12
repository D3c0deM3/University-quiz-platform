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
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_js_1 = require("./auth.service.js");
const index_js_1 = require("./dto/index.js");
const index_js_2 = require("./guards/index.js");
const index_js_3 = require("./decorators/index.js");
const REFRESH_COOKIE_NAME = '__refresh_token';
const isProduction = process.env.NODE_ENV === 'production';
const cookieDomain = process.env.COOKIE_DOMAIN?.trim();
const refreshCookieSameSite = isProduction ? 'none' : 'lax';
const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: isProduction,
    sameSite: refreshCookieSameSite,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
};
const REFRESH_COOKIE_CLEAR_OPTIONS = {
    path: '/api/auth',
    ...(cookieDomain ? { domain: cookieDomain } : {}),
};
function extractSessionContext(req) {
    return {
        ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
            req.ip ||
            req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'] || undefined,
        fingerprint: req.headers['x-device-fingerprint'],
        deviceName: req.headers['x-device-name'],
    };
}
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async register(dto, req, res) {
        const ctx = extractSessionContext(req);
        const result = await this.authService.register(dto, ctx);
        res.cookie(REFRESH_COOKIE_NAME, result._refreshToken, REFRESH_COOKIE_OPTIONS);
        const { _refreshToken, ...response } = result;
        return response;
    }
    async registerWithOtp(dto, req, res) {
        const ctx = extractSessionContext(req);
        const result = await this.authService.registerWithOtp(dto, ctx);
        res.cookie(REFRESH_COOKIE_NAME, result._refreshToken, REFRESH_COOKIE_OPTIONS);
        const { _refreshToken, ...response } = result;
        return response;
    }
    async getOtpLink(dto) {
        return this.authService.getOtpLink(dto.phone);
    }
    async verifyOtp(dto) {
        return this.authService.verifyOtp(dto.phone, dto.code);
    }
    async login(dto, req, res) {
        const ctx = extractSessionContext(req);
        const result = await this.authService.login(dto, ctx);
        res.cookie(REFRESH_COOKIE_NAME, result._refreshToken, REFRESH_COOKIE_OPTIONS);
        const { _refreshToken, ...response } = result;
        return response;
    }
    async getProfile(userId) {
        return this.authService.getProfile(userId);
    }
    async refresh(req, res) {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ||
            req.headers['x-refresh-token'] ||
            req.body?.refreshToken;
        if (!refreshToken) {
            res
                .status(401)
                .json({ message: 'No refresh token provided' });
            return;
        }
        const ctx = extractSessionContext(req);
        const result = await this.authService.refreshToken(refreshToken, ctx);
        res.cookie(REFRESH_COOKIE_NAME, result.refreshToken, REFRESH_COOKIE_OPTIONS);
        return {
            accessToken: result.accessToken,
            sessionId: result.sessionId,
        };
    }
    async logout(sessionId, req, res) {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] ||
            req.headers['x-refresh-token'] ||
            req.body?.refreshToken;
        const result = await this.authService.logout(refreshToken, sessionId);
        res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_CLEAR_OPTIONS);
        return result;
    }
    async logoutAll(userId, res) {
        const result = await this.authService.logoutAllDevices(userId);
        res.clearCookie(REFRESH_COOKIE_NAME, REFRESH_COOKIE_CLEAR_OPTIONS);
        return result;
    }
    async getSessions(userId) {
        return this.authService.getActiveSessions(userId);
    }
    async revokeSession(userId, sessionId) {
        return this.authService.revokeSession(userId, sessionId);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.RegisterDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('register-with-otp'),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.RegisterWithOtpDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerWithOtp", null);
__decorate([
    (0, common_1.Post)('otp-link'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 5 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.GetOtpLinkDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getOtpLink", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, throttler_1.Throttle)({ default: { ttl: 60000, limit: 10 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [index_js_1.LoginDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Get)('profile'),
    (0, common_1.UseGuards)(index_js_2.JwtAuthGuard),
    __param(0, (0, index_js_3.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(index_js_2.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, index_js_3.CurrentUser)('sessionId')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.UseGuards)(index_js_2.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, index_js_3.CurrentUser)('id')),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Get)('sessions'),
    (0, common_1.UseGuards)(index_js_2.JwtAuthGuard),
    __param(0, (0, index_js_3.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getSessions", null);
__decorate([
    (0, common_1.Post)('sessions/revoke'),
    (0, common_1.UseGuards)(index_js_2.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, index_js_3.CurrentUser)('id')),
    __param(1, (0, common_1.Body)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "revokeSession", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_js_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map