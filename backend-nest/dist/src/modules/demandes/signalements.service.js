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
exports.SignalementsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const roles_constants_1 = require("../../auth/roles.constants");
let SignalementsService = class SignalementsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(user, statut) {
        const isCentral = this.isServicesCentraux(user);
        const isManager = this.isManager(user);
        const userId = BigInt(user.userId);
        const entiteScope = isCentral
            ? []
            : isManager
                ? await this.expandUserEntiteScope(user)
                : [];
        const where = {
            ...(statut ? { statut: statut } : {}),
        };
        if (!isCentral) {
            if (isManager) {
                where.OR = [
                    { auteur_id: userId },
                    { id_entite_cible: { in: entiteScope.map((id) => BigInt(id)) } },
                    { escalade_sc: true, id_entite_cible: { in: entiteScope.map((id) => BigInt(id)) } },
                ];
            }
            else {
                where.auteur_id = userId;
            }
        }
        const items = await this.prisma.signalement.findMany({
            where,
            orderBy: { date_creation: 'desc' },
            include: {
                utilisateur_signalement_auteur_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_traitant_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_cloture_par_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_user_cibleToutilisateur: { select: { nom: true, prenom: true, login: true } },
                entite_structure: { select: { nom: true, type_entite: true } },
            },
        });
        return items.map((item) => this.mapSignalement(item));
    }
    async create(userId, payload) {
        const created = await this.prisma.signalement.create({
            data: {
                auteur_id: BigInt(userId),
                id_entite_cible: payload.id_entite_cible ? BigInt(payload.id_entite_cible) : null,
                id_user_cible: payload.id_user_cible ? BigInt(payload.id_user_cible) : null,
                description: payload.description,
                type_signalement: payload.type_signalement ?? 'AUTRE',
                statut: 'OUVERT',
            },
            include: {
                utilisateur_signalement_auteur_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_traitant_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_cloture_par_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_user_cibleToutilisateur: { select: { nom: true, prenom: true, login: true } },
                entite_structure: { select: { nom: true, type_entite: true } },
            },
        });
        return this.mapSignalement(created);
    }
    async update(id, user, payload) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Signalement not found');
        }
        const existing = await this.prisma.signalement.findUnique({
            where: { id_signalement: parsedId },
        });
        if (!existing) {
            throw new common_1.NotFoundException('Signalement not found');
        }
        const isCentral = this.isServicesCentraux(user);
        const isManager = this.isManager(user);
        const userId = BigInt(user.userId);
        if (!isCentral && isManager && existing.id_entite_cible) {
            const entiteScope = await this.expandUserEntiteScope(user);
            if (!entiteScope.includes(String(existing.id_entite_cible))) {
                throw new common_1.ForbiddenException('Signalement out of scope');
            }
        }
        if (!isCentral && !isManager && existing.auteur_id !== userId) {
            throw new common_1.ForbiddenException('You can only update your own signalements');
        }
        const data = {};
        if (payload.escalade_sc === true) {
            if (!isManager && !isCentral) {
                throw new common_1.ForbiddenException('Only managers can escalate signalements');
            }
            data.escalade_sc = true;
        }
        if (payload.statut) {
            if (!isCentral && !isManager) {
                throw new common_1.ForbiddenException('Only managers can change statut');
            }
            if (!isCentral && existing.escalade_sc && payload.statut === 'CLOTURE') {
                throw new common_1.ForbiddenException('Ce signalement est escaladé aux services centraux');
            }
            data.statut = payload.statut;
        }
        if (payload.statut === 'EN_COURS') {
            data.traitant_id = userId;
            data.date_prise_en_charge = new Date();
            data.commentaire_prise_en_charge = payload.commentaire ?? null;
        }
        if (payload.statut === 'CLOTURE') {
            if (!payload.commentaire?.trim()) {
                throw new common_1.BadRequestException('commentaire is required when closing');
            }
            data.cloture_par_id = userId;
            data.date_traitement = new Date();
            data.commentaire_cloture = payload.commentaire.trim();
        }
        const updated = await this.prisma.signalement.update({
            where: { id_signalement: parsedId },
            data,
            include: {
                utilisateur_signalement_auteur_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_traitant_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_cloture_par_idToutilisateur: { select: { nom: true, prenom: true } },
                utilisateur_signalement_user_cibleToutilisateur: { select: { nom: true, prenom: true, login: true } },
                entite_structure: { select: { nom: true, type_entite: true } },
            },
        });
        return this.mapSignalement(updated);
    }
    mapSignalement(item) {
        const auteur = item.utilisateur_signalement_auteur_idToutilisateur;
        const traitant = item.utilisateur_signalement_traitant_idToutilisateur;
        const cloture = item.utilisateur_signalement_cloture_par_idToutilisateur;
        const userCible = item.utilisateur_signalement_user_cibleToutilisateur;
        return {
            id_signalement: Number(item.id_signalement),
            auteur_id: Number(item.auteur_id),
            traitant_id: item.traitant_id ? Number(item.traitant_id) : null,
            cloture_par_id: item.cloture_par_id ? Number(item.cloture_par_id) : null,
            id_entite_cible: item.id_entite_cible ? Number(item.id_entite_cible) : null,
            id_user_cible: item.id_user_cible ? Number(item.id_user_cible) : null,
            description: item.description,
            type_signalement: item.type_signalement ?? 'AUTRE',
            escalade_sc: item.escalade_sc ?? false,
            statut: item.statut,
            date_creation: item.date_creation.toISOString(),
            date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? null,
            date_traitement: item.date_traitement?.toISOString() ?? null,
            commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? null,
            commentaire_cloture: item.commentaire_cloture ?? null,
            auteur_nom: auteur ? `${auteur.prenom} ${auteur.nom}` : null,
            traitant_nom: traitant ? `${traitant.prenom} ${traitant.nom}` : null,
            cloture_nom: cloture ? `${cloture.prenom} ${cloture.nom}` : null,
            user_cible_nom: userCible ? `${userCible.prenom} ${userCible.nom}` : null,
            user_cible_login: userCible?.login ?? null,
            entite_nom: item.entite_structure?.nom ?? null,
            entite_type: item.entite_structure?.type_entite ?? null,
        };
    }
    isServicesCentraux(user) {
        return user.affectations.some((affectation) => affectation.roleId === roles_constants_1.ROLE_IDS.SERVICES_CENTRAUX);
    }
    isManager(user) {
        const managerRoles = new Set([
            roles_constants_1.ROLE_IDS.DIRECTEUR_COMPOSANTE,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
            roles_constants_1.ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
        ]);
        return user.affectations.some((affectation) => managerRoles.has(affectation.roleId));
    }
    async expandUserEntiteScope(user) {
        const yearIds = Array.from(new Set(user.affectations.map((affectation) => affectation.anneeId)));
        const seeds = new Set(user.affectations.map((affectation) => affectation.entiteId));
        if (yearIds.length === 0 || seeds.size === 0) {
            return [];
        }
        const entites = await this.prisma.entite_structure.findMany({
            where: {
                id_annee: { in: yearIds.map((yearId) => BigInt(yearId)) },
            },
            select: { id_entite: true, id_entite_parent: true },
        });
        const parentById = new Map();
        for (const entite of entites) {
            parentById.set(String(entite.id_entite), entite.id_entite_parent ? String(entite.id_entite_parent) : null);
        }
        const scope = new Set();
        for (const entite of entites) {
            const entiteId = String(entite.id_entite);
            if (this.isInSeedTree(entiteId, seeds, parentById)) {
                scope.add(entiteId);
            }
        }
        return Array.from(scope);
    }
    isInSeedTree(entiteId, seeds, parentById) {
        if (seeds.has(entiteId))
            return true;
        let current = parentById.get(entiteId) ?? null;
        for (let depth = 0; depth < 32 && current; depth += 1) {
            if (seeds.has(current))
                return true;
            current = parentById.get(current) ?? null;
        }
        return false;
    }
};
exports.SignalementsService = SignalementsService;
exports.SignalementsService = SignalementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SignalementsService);
//# sourceMappingURL=signalements.service.js.map