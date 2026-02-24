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
exports.ImportsController = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const imports_service_1 = require("./imports.service");
const import_responsables_dto_1 = require("./dto/import-responsables.dto");
const import_confirm_dto_1 = require("./dto/import-confirm.dto");
let ImportsController = class ImportsController {
    importsService;
    constructor(importsService) {
        this.importsService = importsService;
    }
    async previewResponsables(payload) {
        return this.importsService.previewResponsables(payload);
    }
    async confirmResponsables(payload) {
        const result = await this.importsService.importResponsables({ rows: payload.rows }, payload.excludeIndices);
        return { result };
    }
    async importResponsables(payload) {
        const result = await this.importsService.importResponsables(payload);
        return { result };
    }
};
exports.ImportsController = ImportsController;
__decorate([
    (0, common_1.Post)('responsables/preview'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX, roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [import_responsables_dto_1.ImportResponsablesDto]),
    __metadata("design:returntype", Promise)
], ImportsController.prototype, "previewResponsables", null);
__decorate([
    (0, common_1.Post)('responsables/confirm'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX, roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [import_confirm_dto_1.ImportConfirmDto]),
    __metadata("design:returntype", Promise)
], ImportsController.prototype, "confirmResponsables", null);
__decorate([
    (0, common_1.Post)('responsables'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX, roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [import_responsables_dto_1.ImportResponsablesDto]),
    __metadata("design:returntype", Promise)
], ImportsController.prototype, "importResponsables", null);
exports.ImportsController = ImportsController = __decorate([
    (0, common_1.Controller)('imports'),
    __metadata("design:paramtypes", [imports_service_1.ImportsService])
], ImportsController);
//# sourceMappingURL=imports.controller.js.map