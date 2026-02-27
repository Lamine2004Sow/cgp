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
exports.AffectationsController = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const affectations_service_1 = require("./affectations.service");
const create_affectation_dto_1 = require("./dto/create-affectation.dto");
const update_affectation_dto_1 = require("./dto/update-affectation.dto");
let AffectationsController = class AffectationsController {
    affectationsService;
    constructor(affectationsService) {
        this.affectationsService = affectationsService;
    }
    async create(payload) {
        const affectation = await this.affectationsService.create(payload);
        return { affectation };
    }
    async findOne(id) {
        const affectation = await this.affectationsService.findOne(id);
        return { affectation };
    }
    async update(id, payload) {
        const affectation = await this.affectationsService.update(id, payload);
        return { affectation };
    }
    async remove(id) {
        await this.affectationsService.remove(id);
    }
};
exports.AffectationsController = AffectationsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT, roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_affectation_dto_1.CreateAffectationDto]),
    __metadata("design:returntype", Promise)
], AffectationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AffectationsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT, roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_affectation_dto_1.UpdateAffectationDto]),
    __metadata("design:returntype", Promise)
], AffectationsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT, roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AffectationsController.prototype, "remove", null);
exports.AffectationsController = AffectationsController = __decorate([
    (0, common_1.Controller)('affectations'),
    __metadata("design:paramtypes", [affectations_service_1.AffectationsService])
], AffectationsController);
//# sourceMappingURL=affectations.controller.js.map