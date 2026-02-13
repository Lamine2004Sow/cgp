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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RolesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const roles_constants_1 = require("../../auth/roles.constants");
let RolesService = class RolesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const roles = await this.prisma.role.findMany({
            orderBy: { niveau_hierarchique: 'asc' },
        });
        return roles.map((item) => this.toRoleResponse(item));
    }
    toRoleResponse(item) {
        return {
            id: item.id_role,
            libelle: item.libelle,
            description: item.description,
            niveauHierarchique: item.niveau_hierarchique,
            isGlobal: item.is_global,
            idComposante: item.id_composante ? String(item.id_composante) : null,
        };
    }
    async listRequests(user, statut) {
        const where = {
            ...(this.isServicesCentraux(user)
                ? {}
                : { id_user_createur: BigInt(user.userId) }),
            ...(statut ? { statut: statut } : {}),
        };
        const items = await this.prisma.demande_role.findMany({
            where,
            orderBy: { date_creation: 'desc' },
            include: {
                utilisateur_demande_role_id_user_createurToutilisateur: true,
                utilisateur_demande_role_id_user_validateurToutilisateur: true,
            },
        });
        return items.map((item) => ({
            id_demande_role: Number(item.id_demande_role),
            id_user_createur: Number(item.id_user_createur),
            id_user_validateur: item.id_user_validateur
                ? Number(item.id_user_validateur)
                : null,
            role_propose: item.role_propose,
            description: item.description,
            justificatif: item.justificatif,
            statut: item.statut,
            date_creation: item.date_creation.toISOString(),
            date_decision: item.date_decision?.toISOString() ?? null,
            createur_nom: item.utilisateur_demande_role_id_user_createurToutilisateur?.nom ?? null,
            createur_prenom: item.utilisateur_demande_role_id_user_createurToutilisateur?.prenom ?? null,
            validateur_nom: item.utilisateur_demande_role_id_user_validateurToutilisateur?.nom ?? null,
            validateur_prenom: item.utilisateur_demande_role_id_user_validateurToutilisateur?.prenom ?? null,
        }));
    }
    async createRequest(user, payload) {
        const roleName = payload.role_propose.trim();
        if (!roleName) {
            throw new common_1.BadRequestException('role_propose is required');
        }
        const created = await this.prisma.demande_role.create({
            data: {
                id_user_createur: BigInt(user.userId),
                role_propose: roleName,
                description: payload.description?.trim() || null,
                justificatif: payload.justificatif?.trim() || null,
                statut: 'EN_ATTENTE',
            },
        });
        return {
            id_demande_role: Number(created.id_demande_role),
            id_user_createur: Number(created.id_user_createur),
            id_user_validateur: null,
            role_propose: created.role_propose,
            description: created.description,
            justificatif: created.justificatif,
            statut: created.statut,
            date_creation: created.date_creation.toISOString(),
            date_decision: created.date_decision?.toISOString() ?? null,
        };
    }
    async reviewRequest(user, id, payload) {
        if (!this.isServicesCentraux(user)) {
            throw new common_1.ForbiddenException('Only services centraux can review role requests');
        }
        if (payload.statut !== 'VALIDEE' && payload.statut !== 'REFUSEE') {
            throw new common_1.BadRequestException('Invalid statut');
        }
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Role request not found');
        }
        const request = await this.prisma.demande_role.findUnique({
            where: { id_demande_role: parsedId },
        });
        if (!request) {
            throw new common_1.NotFoundException('Role request not found');
        }
        const updated = await this.prisma.demande_role.update({
            where: { id_demande_role: parsedId },
            data: {
                statut: payload.statut,
                id_user_validateur: BigInt(user.userId),
                date_decision: new Date(),
            },
        });
        if (payload.statut === 'VALIDEE') {
            const roleId = (payload.role_id?.trim() || this.slugify(request.role_propose)).slice(0, 64);
            if (!roleId) {
                throw new common_1.BadRequestException('role_id is required to validate a request');
            }
            const composanteId = payload.id_composante || (await this.findCreatorComposante(request.id_user_createur));
            await this.prisma.role.upsert({
                where: { id_role: roleId },
                update: {
                    libelle: payload.libelle?.trim() || request.role_propose,
                    description: request.description,
                    niveau_hierarchique: payload.niveau_hierarchique ?? 50,
                    is_global: false,
                    id_composante: composanteId ? BigInt(composanteId) : null,
                },
                create: {
                    id_role: roleId,
                    libelle: payload.libelle?.trim() || request.role_propose,
                    description: request.description,
                    niveau_hierarchique: payload.niveau_hierarchique ?? 50,
                    is_global: false,
                    id_composante: composanteId ? BigInt(composanteId) : null,
                },
            });
        }
        return {
            id_demande_role: Number(updated.id_demande_role),
            id_user_createur: Number(updated.id_user_createur),
            id_user_validateur: updated.id_user_validateur
                ? Number(updated.id_user_validateur)
                : null,
            role_propose: updated.role_propose,
            description: updated.description,
            justificatif: updated.justificatif,
            statut: updated.statut,
            date_creation: updated.date_creation.toISOString(),
            date_decision: updated.date_decision?.toISOString() ?? null,
        };
    }
    isServicesCentraux(user) {
        return user.affectations.some((affectation) => affectation.roleId === roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX);
    }
    async findCreatorComposante(userId) {
        const affectation = await this.prisma.affectation.findFirst({
            where: {
                id_user: userId,
                entite_structure: { type_entite: 'COMPOSANTE' },
            },
            select: { id_entite: true },
            orderBy: { id_affectation: 'asc' },
        });
        return affectation ? Number(affectation.id_entite) : null;
    }
    slugify(input) {
        return input
            .toLowerCase()
            .normalize('NFD')
            .replace(/[^a-z0-9\s-]/g, '')
            .trim()
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');
    }
};
exports.RolesService = RolesService;
exports.RolesService = RolesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RolesService);
//# sourceMappingURL=roles.service.js.map