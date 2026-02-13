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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const roles_constants_1 = require("../../auth/roles.constants");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const users_service_1 = require("./users.service");
const users_list_query_dto_1 = require("./dto/users-list-query.dto");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
let UsersController = class UsersController {
    usersService;
    constructor(usersService) {
        this.usersService = usersService;
    }
    async list(user, query) {
        return this.usersService.findAll(query, user);
    }
    async get(currentUser, id) {
        const user = await this.usersService.findOne(id, currentUser);
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return { user };
    }
    async create(payload) {
        const user = await this.usersService.create(payload);
        return { user };
    }
    async update(currentUser, id, payload) {
        const isSelf = currentUser.userId === id;
        if (isSelf) {
            if (payload.nom !== undefined ||
                payload.prenom !== undefined ||
                payload.email_institutionnel !== undefined) {
                throw new common_1.ForbiddenException('You can only update telephone and bureau on your own profile');
            }
        }
        else {
            const managerRoles = new Set([
                roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE,
                roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
                roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
            ]);
            const canManageOthers = currentUser.affectations.some((affectation) => {
                return managerRoles.has(affectation.roleId);
            });
            if (!canManageOthers) {
                throw new common_1.ForbiddenException('Insufficient role to update another user');
            }
            const target = await this.usersService.findOne(id, currentUser);
            if (!target) {
                throw new common_1.NotFoundException('User not found');
            }
        }
        const user = await this.usersService.update(id, payload);
        return { user };
    }
    async remove(currentUser, id) {
        const target = await this.usersService.findOne(id, currentUser);
        if (!target) {
            throw new common_1.NotFoundException('User not found');
        }
        await this.usersService.remove(id);
        return { status: 'deleted' };
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, users_list_query_dto_1.UsersListQueryDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "get", null);
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF, roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT, roles_constants_1.ROLE_IDS.DIRECTEUR_DEPARTEMENT, roles_constants_1.ROLE_IDS.DIRECTEUR_MENTION, roles_constants_1.ROLE_IDS.DIRECTEUR_SPECIALITE, roles_constants_1.ROLE_IDS.RESPONSABLE_FORMATION, roles_constants_1.ROLE_IDS.RESPONSABLE_ANNEE, roles_constants_1.ROLE_IDS.UTILISATEUR_SIMPLE, roles_constants_1.ROLE_IDS.LECTURE_SEULE, roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX, roles_constants_1.ROLE_IDS.ADMINISTRATEUR),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)(roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, roles_decorator_1.Roles)(...Object.values(roles_constants_1.ROLE_IDS)),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map