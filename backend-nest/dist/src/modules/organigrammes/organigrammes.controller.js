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
let OrganigrammesController = class OrganigrammesController {
    organigrammesService;
    constructor(organigrammesService) {
        this.organigrammesService = organigrammesService;
    }
    async list(query) {
        const items = await this.organigrammesService.list(query.yearId);
        return { items };
    }
    async latest(query) {
        if (!query.yearId) {
            return { organigramme: null, arbre: null };
        }
        return this.organigrammesService.latest(query.yearId);
    }
    async generate(request, payload) {
        const userId = request.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException();
        }
        return this.organigrammesService.generate(payload.id_annee, payload.id_entite_racine, userId);
    }
    async tree(id) {
        return this.organigrammesService.getTreeById(id);
    }
    async freeze(id) {
        return this.organigrammesService.freeze(id);
    }
};
exports.OrganigrammesController = OrganigrammesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [organigrammes_list_query_dto_1.OrganigrammesListQueryDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)('latest'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [organigrammes_list_query_dto_1.OrganigrammesListQueryDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "latest", null);
__decorate([
    (0, common_1.Post)('generate'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, organigramme_generate_dto_1.OrganigrammeGenerateDto]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "generate", null);
__decorate([
    (0, common_1.Get)(':id/tree'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "tree", null);
__decorate([
    (0, common_1.Patch)(':id/freeze'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganigrammesController.prototype, "freeze", null);
exports.OrganigrammesController = OrganigrammesController = __decorate([
    (0, common_1.Controller)('organigrammes'),
    __metadata("design:paramtypes", [organigrammes_service_1.OrganigrammesService])
], OrganigrammesController);
//# sourceMappingURL=organigrammes.controller.js.map