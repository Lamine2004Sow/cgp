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
exports.AnneesController = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const annees_service_1 = require("./annees.service");
const years_list_query_dto_1 = require("./dto/years-list-query.dto");
const clone_year_dto_1 = require("./dto/clone-year.dto");
const update_year_status_dto_1 = require("./dto/update-year-status.dto");
let AnneesController = class AnneesController {
    anneesService;
    constructor(anneesService) {
        this.anneesService = anneesService;
    }
    async list(user, query) {
        const items = await this.anneesService.listForUser(user, query.statut);
        return { items };
    }
    async findOne(id) {
        const year = await this.anneesService.findOne(id);
        return { year };
    }
    async clone(id, payload) {
        const year = await this.anneesService.cloneYear(id, payload);
        return { year };
    }
    async updateStatus(id, payload) {
        const year = await this.anneesService.updateStatus(id, payload.statut);
        return { year };
    }
    async remove(id) {
        return this.anneesService.deleteYear(id);
    }
};
exports.AnneesController = AnneesController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, years_list_query_dto_1.YearsListQueryDto]),
    __metadata("design:returntype", Promise)
], AnneesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnneesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/clone'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, clone_year_dto_1.CloneYearDto]),
    __metadata("design:returntype", Promise)
], AnneesController.prototype, "clone", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_year_status_dto_1.UpdateYearStatusDto]),
    __metadata("design:returntype", Promise)
], AnneesController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnneesController.prototype, "remove", null);
exports.AnneesController = AnneesController = __decorate([
    (0, common_1.Controller)('years'),
    __metadata("design:paramtypes", [annees_service_1.AnneesService])
], AnneesController);
//# sourceMappingURL=annees.controller.js.map