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
const delegations_service_1 = require("./delegations.service");
const create_delegation_dto_1 = require("./dto/create-delegation.dto");
let DelegationsController = class DelegationsController {
    delegationsService;
    constructor(delegationsService) {
        this.delegationsService = delegationsService;
    }
    async list() {
        const items = await this.delegationsService.list();
        return { items };
    }
    async create(request, payload) {
        const userId = request.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException();
        }
        const delegation = await this.delegationsService.create(userId, payload);
        return { delegation };
    }
    async revoke(id) {
        const delegation = await this.delegationsService.revoke(id);
        return { delegation };
    }
};
exports.DelegationsController = DelegationsController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DelegationsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_delegation_dto_1.CreateDelegationDto]),
    __metadata("design:returntype", Promise)
], DelegationsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/revoke'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], DelegationsController.prototype, "revoke", null);
exports.DelegationsController = DelegationsController = __decorate([
    (0, common_1.Controller)('delegations'),
    __metadata("design:paramtypes", [delegations_service_1.DelegationsService])
], DelegationsController);
//# sourceMappingURL=delegations.controller.js.map