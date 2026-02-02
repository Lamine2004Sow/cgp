"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const status = exception.getStatus();
        const payload = exception.getResponse();
        const normalized = this.normalizePayload(payload);
        response.status(status).json({
            statusCode: status,
            error: normalized.error ?? exception.name,
            message: normalized.message ?? 'Unexpected error',
            details: normalized.details,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
    normalizePayload(payload) {
        if (typeof payload === 'string') {
            return { message: payload };
        }
        if (payload && typeof payload === 'object') {
            const data = payload;
            return {
                message: data.message,
                error: data.error,
                details: data.details,
            };
        }
        return {};
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)(common_1.HttpException)
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map