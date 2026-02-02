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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("../../auth/auth.service");
let MockAuthGuard = class MockAuthGuard {
    authService;
    configService;
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authMode = this.configService.get('AUTH_MODE', 'mock');
        const nodeEnv = this.configService.get('NODE_ENV', 'development');
        if (request.path?.endsWith('/health')) {
            return true;
        }
        if (authMode !== 'mock') {
            return true;
        }
        if (nodeEnv !== 'development') {
            throw new common_1.ForbiddenException('Mock auth is disabled outside development.');
        }
        const login = request.header('x-user-login');
        if (!login) {
            throw new common_1.UnauthorizedException('Missing x-user-login header.');
        }
        const currentUser = await this.authService.buildCurrentUserByLogin(login);
        if (!currentUser) {
            throw new common_1.UnauthorizedException('Unknown user login.');
        }
        request.user = currentUser;
        return true;
    }
};
exports.MockAuthGuard = MockAuthGuard;
exports.MockAuthGuard = MockAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], MockAuthGuard);
//# sourceMappingURL=mock-auth.guard.js.map