"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthorizationService = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("./roles.constants");
let AuthorizationService = class AuthorizationService {
    canRead(user) {
        return user.affectations.length > 0;
    }
    canWrite(user) {
        const restricted = new Set([
            roles_constants_1.ROLE_IDS.UTILISATEUR_SIMPLE,
            roles_constants_1.ROLE_IDS.LECTURE_SEULE,
        ]);
        return this.hasAnyRole(user, this.allWriteRoles()).some((role) => !restricted.has(role));
    }
    canExport(user) {
        return this.hasAnyRole(user, [roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX]).length > 0;
    }
    canImport(user) {
        return (this.hasAnyRole(user, [
            roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
        ]).length > 0);
    }
    canDelegate(user) {
        return (this.hasAnyRole(user, [
            roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
        ]).length > 0);
    }
    canFreezeYear(user) {
        return this.hasAnyRole(user, [roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX]).length > 0;
    }
    hasAnyRole(user, roleIds) {
        const userRoles = new Set(user.affectations.map((affectation) => affectation.roleId));
        return roleIds.filter((roleId) => userRoles.has(roleId));
    }
    allWriteRoles() {
        return [
            roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
            roles_constants_1.ROLE_IDS.DIRECTEUR_DEPARTEMENT,
            roles_constants_1.ROLE_IDS.DIRECTEUR_MENTION,
            roles_constants_1.ROLE_IDS.DIRECTEUR_SPECIALITE,
            roles_constants_1.ROLE_IDS.RESPONSABLE_FORMATION,
            roles_constants_1.ROLE_IDS.RESPONSABLE_ANNEE,
            roles_constants_1.ROLE_IDS.UTILISATEUR_SIMPLE,
            roles_constants_1.ROLE_IDS.LECTURE_SEULE,
        ];
    }
};
exports.AuthorizationService = AuthorizationService;
exports.AuthorizationService = AuthorizationService = __decorate([
    (0, common_1.Injectable)()
], AuthorizationService);
//# sourceMappingURL=authorization.service.js.map