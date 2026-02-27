"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AllExceptionsFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AllExceptionsFilter = void 0;
const common_1 = require("@nestjs/common");
let AllExceptionsFilter = AllExceptionsFilter_1 = class AllExceptionsFilter {
    logger = new common_1.Logger(AllExceptionsFilter_1.name);
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();
        const isHttp = exception instanceof common_1.HttpException;
        const status = isHttp
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const payload = isHttp ? exception.getResponse() : null;
        const message = this.extractMessage(exception, payload);
        if (!isHttp) {
            this.logger.error(`${request.method} ${request.url} - ${message}`, exception instanceof Error ? exception.stack : undefined);
        }
        response.status(status).json({
            statusCode: status,
            error: isHttp && payload && typeof payload === 'object' && 'error' in payload
                ? payload.error
                : 'Internal Server Error',
            message,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
    extractMessage(exception, payload) {
        if (payload && typeof payload === 'object' && 'message' in payload) {
            const m = payload.message;
            if (Array.isArray(m) && m.length)
                return m[0];
            if (typeof m === 'string')
                return m;
        }
        if (exception instanceof Error && exception.message) {
            return exception.message;
        }
        return 'Erreur serveur';
    }
};
exports.AllExceptionsFilter = AllExceptionsFilter;
exports.AllExceptionsFilter = AllExceptionsFilter = AllExceptionsFilter_1 = __decorate([
    (0, common_1.Catch)()
], AllExceptionsFilter);
//# sourceMappingURL=all-exceptions.filter.js.map