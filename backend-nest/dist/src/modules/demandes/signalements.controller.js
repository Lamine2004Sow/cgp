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
exports.SignalementsController = void 0;
const common_1 = require("@nestjs/common");
const signalements_service_1 = require("./signalements.service");
const signalements_list_query_dto_1 = require("./dto/signalements-list-query.dto");
const create_signalement_dto_1 = require("./dto/create-signalement.dto");
const update_signalement_dto_1 = require("./dto/update-signalement.dto");
let SignalementsController = class SignalementsController {
    signalementsService;
    constructor(signalementsService) {
        this.signalementsService = signalementsService;
    }
    async list(query) {
        const items = await this.signalementsService.list(query.statut);
        return { items };
    }
    async create(request, payload) {
        const userId = request.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException();
        }
        const signalement = await this.signalementsService.create(userId, payload);
        return { signalement };
    }
    async update(request, id, payload) {
        const userId = request.user?.userId;
        if (!userId) {
            throw new common_1.UnauthorizedException();
        }
        const signalement = await this.signalementsService.update(id, userId, payload);
        return { signalement };
    }
};
exports.SignalementsController = SignalementsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signalements_list_query_dto_1.SignalementsListQueryDto]),
    __metadata("design:returntype", Promise)
], SignalementsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_signalement_dto_1.CreateSignalementDto]),
    __metadata("design:returntype", Promise)
], SignalementsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_signalement_dto_1.UpdateSignalementDto]),
    __metadata("design:returntype", Promise)
], SignalementsController.prototype, "update", null);
exports.SignalementsController = SignalementsController = __decorate([
    (0, common_1.Controller)('signalements'),
    __metadata("design:paramtypes", [signalements_service_1.SignalementsService])
], SignalementsController);
//# sourceMappingURL=signalements.controller.js.map