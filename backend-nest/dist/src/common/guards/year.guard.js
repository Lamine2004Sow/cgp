"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YearGuard = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
let YearGuard = class YearGuard {
    canActivate(context) {
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
        const yearIds = this.extractYearIds(request);
        if (yearIds.length === 0) {
            return true;
        }
        const userYears = new Set(user.affectations.map((affectation) => affectation.anneeId));
        return yearIds.every((yearId) => userYears.has(yearId));
    }
    extractYearIds(request) {
        const values = new Set();
        const candidates = [
            request.params?.anneeId,
            request.params?.id_annee,
            request.query?.anneeId,
            request.query?.id_annee,
            request.query?.yearId,
            request.query?.annee,
        ];
        for (const candidate of candidates) {
            this.addNormalized(candidate, values);
        }
        this.walkBodyForYearIds(request.body, values);
        return Array.from(values);
    }
    walkBodyForYearIds(value, out) {
        if (value === null || value === undefined) {
            return;
        }
        if (Array.isArray(value)) {
            for (const item of value) {
                this.walkBodyForYearIds(item, out);
            }
            return;
        }
        if (typeof value !== 'object') {
            return;
        }
        for (const [key, child] of Object.entries(value)) {
            if (key === 'id_annee' ||
                key === 'anneeId' ||
                key === 'yearId' ||
                key === 'annee' ||
                key === 'id_annee_source') {
                this.addNormalized(child, out);
            }
            this.walkBodyForYearIds(child, out);
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
};
exports.YearGuard = YearGuard;
exports.YearGuard = YearGuard = __decorate([
    (0, common_1.Injectable)()
], YearGuard);
//# sourceMappingURL=year.guard.js.map