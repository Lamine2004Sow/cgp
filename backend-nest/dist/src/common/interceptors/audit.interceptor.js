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
exports.AuditInterceptor = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const operators_1 = require("rxjs/operators");
const audit_decorator_1 = require("../decorators/audit.decorator");
const audit_service_1 = require("../../modules/audit/audit.service");
const METHOD_ACTION_MAP = {
    POST: 'CREATE',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE',
};
let AuditInterceptor = class AuditInterceptor {
    reflector;
    auditService;
    constructor(reflector, auditService) {
        this.reflector = reflector;
        this.auditService = auditService;
    }
    intercept(context, next) {
        const http = context.switchToHttp();
        const request = http.getRequest();
        const method = request.method ?? 'GET';
        const actionMetadata = this.reflector.getAllAndOverride(audit_decorator_1.AUDIT_ACTION_KEY, [context.getHandler(), context.getClass()]);
        const targetMetadata = this.reflector.getAllAndOverride(audit_decorator_1.AUDIT_TARGET_KEY, [context.getHandler(), context.getClass()]);
        const inferredAction = METHOD_ACTION_MAP[method];
        const shouldAudit = Boolean(actionMetadata || inferredAction);
        if (!shouldAudit) {
            return next.handle();
        }
        const action = actionMetadata ?? inferredAction;
        const targetType = targetMetadata ?? request.route?.path ?? 'unknown';
        const targetId = this.extractTargetId(request);
        return next.handle().pipe((0, operators_1.tap)(async () => {
            try {
                await this.auditService.log({
                    userId: request.user?.userId,
                    action,
                    targetType,
                    targetId,
                });
            }
            catch {
            }
        }));
    }
    extractTargetId(request) {
        const paramId = request.params?.id ?? request.params?.['id_entite'];
        if (paramId) {
            return String(paramId);
        }
        return undefined;
    }
};
exports.AuditInterceptor = AuditInterceptor;
exports.AuditInterceptor = AuditInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        audit_service_1.AuditService])
], AuditInterceptor);
//# sourceMappingURL=audit.interceptor.js.map