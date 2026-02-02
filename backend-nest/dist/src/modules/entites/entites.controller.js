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
exports.EntitesController = void 0;
const common_1 = require("@nestjs/common");
const entites_service_1 = require("./entites.service");
const entites_list_query_dto_1 = require("./dto/entites-list-query.dto");
let EntitesController = class EntitesController {
    entitesService;
    constructor(entitesService) {
        this.entitesService = entitesService;
    }
    async list(query) {
        const items = await this.entitesService.list(query.yearId);
        return { items };
    }
};
exports.EntitesController = EntitesController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [entites_list_query_dto_1.EntitesListQueryDto]),
    __metadata("design:returntype", Promise)
], EntitesController.prototype, "list", null);
exports.EntitesController = EntitesController = __decorate([
    (0, common_1.Controller)('entites'),
    __metadata("design:paramtypes", [entites_service_1.EntitesService])
], EntitesController);
//# sourceMappingURL=entites.controller.js.map