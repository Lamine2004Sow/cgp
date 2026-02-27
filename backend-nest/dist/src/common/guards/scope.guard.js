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
exports.ScopeGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_constants_1 = require("../../auth/roles.constants");
let ScopeGuard = class ScopeGuard {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        if (request.path?.endsWith('/health')) {
            return true;
        }
        const user = request.user;
        if (!user) {
            return false;
        }
        if (user.affectations.some((affectation) => affectation.roleId === roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX)) {
            return true;
        }
        const entiteIds = this.extractEntiteIds(request);
        if (entiteIds.length === 0) {
            return true;
        }
        const userEntiteIds = new Set(user.affectations.map((affectation) => affectation.entiteId));
        for (const entiteId of entiteIds) {
            if (userEntiteIds.has(entiteId)) {
                continue;
            }
            const inHierarchy = await this.isDescendantOfUserScope(entiteId, userEntiteIds);
            if (!inHierarchy) {
                return false;
            }
        }
        return true;
    }
    extractEntiteIds(request) {
        const values = new Set();
        const candidates = [
            request.params?.entiteId,
            request.params?.id_entite,
            request.params?.id_entite_cible,
            request.params?.id_entite_racine,
            request.query?.entiteId,
            request.query?.id_entite,
            request.query?.id_entite_cible,
            request.query?.id_entite_racine,
            request.query?.scopeEntite,
        ];
        for (const candidate of candidates) {
            this.addNormalized(candidate, values);
        }
        this.walkBodyForEntiteIds(request.body, values);
        return Array.from(values);
    }
    walkBodyForEntiteIds(value, out) {
        if (value === null || value === undefined) {
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                this.walkBodyForEntiteIds(item, out);
            }
            return;
        }
        if (typeof value !== 'object') {
            return;
        }
        for (const [key, child] of Object.entries(value)) {
            if (key === 'id_entite' ||
                key === 'id_entite_cible' ||
                key === 'id_entite_racine' ||
                key === 'entiteId' ||
                key === 'scopeEntite' ||
                key === 'id_composante') {
                this.addNormalized(child, out);
            }
            this.walkBodyForEntiteIds(child, out);
        }
    }
    addNormalized(raw, out) {
        if (raw === null || raw === undefined) {
            return;
        }
        if (Array.isArray(raw)) {
            for (const item of raw) {
                this.addNormalized(item, out);
            }
            return;
        }
        const value = String(raw).trim();
        if (!/^\d+$/.test(value)) {
            return;
        }
        out.add(value);
    }
    async isDescendantOfUserScope(entiteId, userEntiteIds) {
        let currentId;
        try {
            currentId = BigInt(entiteId);
        }
        catch {
            return false;
        }
        for (let depth = 0; depth < 32; depth += 1) {
            const entite = await this.prisma.entite_structure.findUnique({
                where: { id_entite: currentId },
                select: { id_entite_parent: true },
            });
            if (!entite || !entite.id_entite_parent) {
                return false;
            }
            const parentId = String(entite.id_entite_parent);
            if (userEntiteIds.has(parentId)) {
                return true;
            }
            currentId = entite.id_entite_parent;
        }
        return false;
    }
};
exports.ScopeGuard = ScopeGuard;
exports.ScopeGuard = ScopeGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ScopeGuard);
//# sourceMappingURL=scope.guard.js.map