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
exports.DelegationsController = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const delegations_service_1 = require("./delegations.service");
const create_delegation_dto_1 = require("./dto/create-delegation.dto");
const delegations_list_query_dto_1 = require("./dto/delegations-list-query.dto");
let DelegationsController = class DelegationsController {
    delegationsService;
    constructor(delegationsService) {
        this.delegationsService = delegationsService;
    }
    async list(user, query) {
        const items = await this.delegationsService.list(user, query);
        return { items };
    }
    async create(user, payload) {
        const delegation = await this.delegationsService.create(user.userId, payload, user);
        return { delegation };
    }
    async export(user, query) {
        const csv = await this.delegationsService.exportCsv(user, query);
        return { csv };
    }
    async revoke(user, id) {
        const delegation = await this.delegationsService.revoke(user, id);
        return { delegation };
    }
};
exports.DelegationsController = DelegationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delegations_list_query_dto_1.DelegationsListQueryDto]),
    __metadata("design:returntype", Promise)
], DelegationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_delegation_dto_1.CreateDelegationDto]),
    __metadata("design:returntype", Promise)
], DelegationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('export'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, delegations_list_query_dto_1.DelegationsListQueryDto]),
    __metadata("design:returntype", Promise)
], DelegationsController.prototype, "export", null);
__decorate([
    (0, common_1.Patch)(':id/revoke'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], DelegationsController.prototype, "revoke", null);
exports.DelegationsController = DelegationsController = __decorate([
    (0, common_1.Controller)('delegations'),
    __metadata("design:paramtypes", [delegations_service_1.DelegationsService])
], DelegationsController);
//# sourceMappingURL=delegations.controller.js.map