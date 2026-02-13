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
exports.DelegationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const roles_constants_1 = require("../../auth/roles.constants");
let DelegationsService = class DelegationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user, query) {
        const isCentral = this.isServicesCentraux(user);
        const where = {
            ...(isCentral
                ? {}
                : {
                    OR: [
                        { delegant_id: BigInt(user.userId) },
                        { delegataire_id: BigInt(user.userId) },
                    ],
                }),
            ...(query?.statut ? { statut: query.statut } : {}),
            ...(query?.entiteId ? { id_entite: BigInt(query.entiteId) } : {}),
        };
        const items = await this.prisma.delegation.findMany({
            where,
            orderBy: { date_debut: 'desc' },
            include: {
                utilisateur_delegation_delegant_idToutilisateur: true,
                utilisateur_delegation_delegataire_idToutilisateur: true,
                entite_structure: true,
            },
        });
        return items.map((item) => this.mapDelegation(item));
    }
    async create(delegantId, payload) {
        if (String(payload.delegataire_id) === delegantId) {
            throw new common_1.BadRequestException('delegataire_id must differ from delegant');
        }
        const created = await this.prisma.delegation.create({
            data: {
                delegant_id: BigInt(delegantId),
                delegataire_id: BigInt(payload.delegataire_id),
                id_entite: BigInt(payload.id_entite),
                id_role: payload.id_role ?? null,
                type_droit: payload.type_droit,
                date_debut: new Date(payload.date_debut),
                date_fin: payload.date_fin ? new Date(payload.date_fin) : null,
            },
        });
        return this.mapDelegation(await this.prisma.delegation.findUnique({
            where: { id_delegation: created.id_delegation },
            include: {
                utilisateur_delegation_delegant_idToutilisateur: true,
                utilisateur_delegation_delegataire_idToutilisateur: true,
                entite_structure: true,
            },
        }) ?? created);
    }
    async revoke(user, id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Delegation not found');
        }
        const delegation = await this.prisma.delegation.findUnique({
            where: { id_delegation: parsedId },
        });
        if (!delegation) {
            throw new common_1.NotFoundException('Delegation not found');
        }
        if (!this.isServicesCentraux(user) &&
            String(delegation.delegant_id) !== user.userId) {
            throw new common_1.ForbiddenException('Only delegant can revoke this delegation');
        }
        const updated = await this.prisma.delegation.update({
            where: { id_delegation: parsedId },
            data: {
                statut: 'ANNULEE',
                date_fin: new Date(),
            },
        });
        return this.mapDelegation(await this.prisma.delegation.findUnique({
            where: { id_delegation: updated.id_delegation },
            include: {
                utilisateur_delegation_delegant_idToutilisateur: true,
                utilisateur_delegation_delegataire_idToutilisateur: true,
                entite_structure: true,
            },
        }) ?? updated);
    }
    async exportCsv(user, query) {
        const items = await this.list(user, query);
        const header = [
            'id_delegation',
            'delegant_nom',
            'delegataire_nom',
            'entite_nom',
            'type_droit',
            'date_debut',
            'date_fin',
            'statut',
        ].join(',');
        const body = items
            .map((item) => [
            item.id_delegation,
            item.delegant_nom ?? '',
            item.delegataire_nom ?? '',
            item.entite_nom ?? '',
            item.type_droit ?? '',
            item.date_debut,
            item.date_fin ?? '',
            item.statut,
        ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(','))
            .join('\n');
        return `${header}\n${body}`;
    }
    mapDelegation(item) {
        return {
            id_delegation: Number(item.id_delegation),
            delegant_id: Number(item.delegant_id),
            delegataire_id: Number(item.delegataire_id),
            id_entite: Number(item.id_entite),
            id_role: item.id_role,
            type_droit: item.type_droit,
            date_debut: item.date_debut.toISOString().slice(0, 10),
            date_fin: item.date_fin ? item.date_fin.toISOString().slice(0, 10) : null,
            statut: item.statut,
            delegant_nom: item.utilisateur_delegation_delegant_idToutilisateur?.nom ?? null,
            delegataire_nom: item.utilisateur_delegation_delegataire_idToutilisateur?.nom ?? null,
            entite_nom: item.entite_structure?.nom ?? null,
        };
    }
    isServicesCentraux(user) {
        return user.affectations.some((affectation) => affectation.roleId === roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX);
    }
};
exports.DelegationsService = DelegationsService;
exports.DelegationsService = DelegationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DelegationsService);
//# sourceMappingURL=delegations.service.js.map