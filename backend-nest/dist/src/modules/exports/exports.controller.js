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
exports.ExportsController = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const exports_service_1 = require("./exports.service");
const exports_query_dto_1 = require("./dto/exports-query.dto");
let ExportsController = class ExportsController {
    exportsService;
    constructor(exportsService) {
        this.exportsService = exportsService;
    }
    async exportResponsables(query) {
        const items = await this.exportsService.exportResponsables({
            yearId: query.yearId,
            entiteId: query.entiteId,
            roleId: query.roleId,
        });
        return { items };
    }
    async exportWorkbook(query) {
        if (!query.yearId) {
            throw new common_1.BadRequestException("Le paramètre yearId est obligatoire.");
        }
        return this.exportsService.exportWorkbook({
            yearId: query.yearId,
            entiteId: query.entiteId,
            template: query.template,
        });
    }
};
exports.ExportsController = ExportsController;
__decorate([
    (0, common_1.Get)('responsables'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [exports_query_dto_1.ExportsQueryDto]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportResponsables", null);
__decorate([
    (0, common_1.Get)('workbook'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [exports_query_dto_1.ExportsQueryDto]),
    __metadata("design:returntype", Promise)
], ExportsController.prototype, "exportWorkbook", null);
exports.ExportsController = ExportsController = __decorate([
    (0, common_1.Controller)('exports'),
    __metadata("design:paramtypes", [exports_service_1.ExportsService])
], ExportsController);
//# sourceMappingURL=exports.controller.js.map