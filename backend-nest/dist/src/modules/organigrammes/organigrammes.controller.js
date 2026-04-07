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
exports.OrganigrammesController = void 0;
const common_1 = require("@nestjs/common");
const organigrammes_service_1 = require("./organigrammes.service");
const organigrammes_list_query_dto_1 = require("./dto/organigrammes-list-query.dto");
const organigramme_generate_dto_1 = require("./dto/organigramme-generate.dto");
const organigramme_export_query_dto_1 = require("./dto/organigramme-export-query.dto");
const organigramme_tree_query_dto_1 = require("./dto/organigramme-tree-query.dto");
const update_organigramme_freeze_dto_1 = require("./dto/update-organigramme-freeze.dto");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let OrganigrammesController = class OrganigrammesController {
    organigrammesService;
    constructor(organigrammesService) {
        this.organigrammesService = organigrammesService;
    }
    async list(user, query) {
        const items = await this.organigrammesService.list(user, query.yearId);
        return { items };
    }
    async latest(user, query) {
        if (!query.yearId) {
            return { organigramme: null, arbre: null };
        }
        return this.organigrammesService.latest(user, query.yearId, query);
    }
    async generate(user, payload) {
        return this.organigrammesService.generate(user, payload.id_annee, payload.id_entite_racine);
    }
    async tree(user, id, query) {
        return this.organigrammesService.getTreeById(user, id, query);
    }
    async freeze(id, payload) {
        return this.organigrammesService.setFreezeState(id, payload.est_fige ?? true);
    }
    async export(user, id, query) {
        return this.organigrammesService.export(user, id, query.format || 'PDF', query);
    }
};
exports.OrganigrammesController = OrganigrammesController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, organigrammes_list_query_dto_1.OrganigrammesListQueryDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('latest'),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, organigramme_tree_query_dto_1.OrganigrammeTreeQueryDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "latest", null);
__decorate([
    (0, common_1.Post)('generate'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX, roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT, roles_constants_1.ROLE_IDS.DIRECTEUR_DEPARTEMENT, roles_constants_1.ROLE_IDS.DIRECTEUR_MENTION, roles_constants_1.ROLE_IDS.DIRECTEUR_SPECIALITE, roles_constants_1.ROLE_IDS.RESPONSABLE_FORMATION),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, organigramme_generate_dto_1.OrganigrammeGenerateDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(':id/tree'),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, organigramme_tree_query_dto_1.OrganigrammeTreeQueryDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "tree", null);
__decorate([
    (0, common_1.Patch)(':id/freeze'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_organigramme_freeze_dto_1.UpdateOrganigrammeFreezeDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "freeze", null);
__decorate([
    (0, common_1.Get)(':id/export'),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, organigramme_export_query_dto_1.OrganigrammeExportQueryDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "export", null);
exports.OrganigrammesController = OrganigrammesController = __decorate([
    (0, common_1.Controller)('organigrammes'),
    __metadata("design:paramtypes", [organigrammes_service_1.OrganigrammesService])
], OrganigrammesController);
//# sourceMappingURL=organigrammes.controller.js.map