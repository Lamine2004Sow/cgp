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
exports.RolesController = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const roles_service_1 = require("./roles.service");
const role_requests_query_dto_1 = require("./dto/role-requests-query.dto");
const create_role_request_dto_1 = require("./dto/create-role-request.dto");
const update_role_request_dto_1 = require("./dto/update-role-request.dto");
let RolesController = class RolesController {
    rolesService;
    constructor(rolesService) {
        this.rolesService = rolesService;
    }
    async listRequests(user, query) {
        const items = await this.rolesService.listRequests(user, query.statut);
        return { items };
    }
    async createRequest(user, payload) {
        const request = await this.rolesService.createRequest(user, payload);
        return { request };
    }
    async reviewRequest(user, id, payload) {
        const request = await this.rolesService.reviewRequest(user, id, payload);
        return { request };
    }
    async list() {
        const items = await this.rolesService.findAll();
        return { items };
    }
};
exports.RolesController = RolesController;
__decorate([
    (0, common_1.Get)('requests'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX, roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT, roles_constants_1.ROLE_IDS.DIRECTEUR_DEPARTEMENT, roles_constants_1.ROLE_IDS.DIRECTEUR_MENTION, roles_constants_1.ROLE_IDS.DIRECTEUR_SPECIALITE, roles_constants_1.ROLE_IDS.RESPONSABLE_FORMATION),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, role_requests_query_dto_1.RoleRequestsQueryDto]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "listRequests", null);
__decorate([
    (0, common_1.Post)('requests'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT, roles_constants_1.ROLE_IDS.DIRECTEUR_DEPARTEMENT, roles_constants_1.ROLE_IDS.DIRECTEUR_MENTION, roles_constants_1.ROLE_IDS.DIRECTEUR_SPECIALITE, roles_constants_1.ROLE_IDS.RESPONSABLE_FORMATION),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_role_request_dto_1.CreateRoleRequestDto]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Patch)('requests/:id'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_role_request_dto_1.UpdateRoleRequestDto]),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "reviewRequest", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RolesController.prototype, "list", null);
exports.RolesController = RolesController = __decorate([
    (0, common_1.Controller)('roles'),
    __metadata("design:paramtypes", [roles_service_1.RolesService])
], RolesController);
//# sourceMappingURL=roles.controller.js.map