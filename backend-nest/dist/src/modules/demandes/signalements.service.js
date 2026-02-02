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
let SignalementsService = class SignalementsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(statut) {
        const items = await this.prisma.signalement.findMany({
            where: statut ? { statut: statut } : undefined,
            orderBy: { date_creation: 'desc' },
            include: {
                utilisateur_signalement_auteur_idToutilisateur: true,
                utilisateur_signalement_traitant_idToutilisateur: true,
                utilisateur_signalement_cloture_par_idToutilisateur: true,
            },
        });
        return items.map((item) => ({
            id_signalement: Number(item.id_signalement),
            auteur_id: Number(item.auteur_id),
            traitant_id: item.traitant_id ? Number(item.traitant_id) : null,
            cloture_par_id: item.cloture_par_id ? Number(item.cloture_par_id) : null,
            id_entite_cible: item.id_entite_cible ? Number(item.id_entite_cible) : null,
            description: item.description,
            statut: item.statut,
            date_creation: item.date_creation.toISOString(),
            date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? null,
            date_traitement: item.date_traitement?.toISOString() ?? null,
            commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? null,
            commentaire_cloture: item.commentaire_cloture ?? null,
            auteur_nom: item.utilisateur_signalement_auteur_idToutilisateur?.nom ?? null,
            auteur_prenom: item.utilisateur_signalement_auteur_idToutilisateur?.prenom ?? null,
            traitant_nom: item.utilisateur_signalement_traitant_idToutilisateur?.nom ?? null,
            traitant_prenom: item.utilisateur_signalement_traitant_idToutilisateur?.prenom ?? null,
            cloture_nom: item.utilisateur_signalement_cloture_par_idToutilisateur?.nom ?? null,
            cloture_prenom: item.utilisateur_signalement_cloture_par_idToutilisateur?.prenom ?? null,
        }));
    }
    async create(userId, payload) {
        const created = await this.prisma.signalement.create({
            data: {
                auteur_id: BigInt(userId),
                id_entite_cible: payload.id_entite_cible ? BigInt(payload.id_entite_cible) : null,
                description: payload.description,
                statut: 'OUVERT',
            },
        });
        return this.mapSignalement(created);
    }
    async update(id, userId, payload) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Signalement not found');
        }
        const data = {};
        if (payload.statut) {
            data.statut = payload.statut;
        }
        if (payload.statut === 'EN_COURS') {
            data.traitant_id = BigInt(userId);
            data.date_prise_en_charge = new Date();
            data.commentaire_prise_en_charge = payload.commentaire ?? null;
        }
        if (payload.statut === 'CLOTURE') {
            data.cloture_par_id = BigInt(userId);
            data.date_traitement = new Date();
            data.commentaire_cloture = payload.commentaire ?? null;
        }
        const updated = await this.prisma.signalement.update({
            where: { id_signalement: parsedId },
            data,
        });
        return this.mapSignalement(updated);
    }
    mapSignalement(item) {
        return {
            id_signalement: Number(item.id_signalement),
            auteur_id: Number(item.auteur_id),
            traitant_id: item.traitant_id ? Number(item.traitant_id) : null,
            cloture_par_id: item.cloture_par_id ? Number(item.cloture_par_id) : null,
            id_entite_cible: item.id_entite_cible ? Number(item.id_entite_cible) : null,
            description: item.description,
            statut: item.statut,
            date_creation: item.date_creation.toISOString(),
            date_prise_en_charge: item.date_prise_en_charge?.toISOString() ?? null,
            date_traitement: item.date_traitement?.toISOString() ?? null,
            commentaire_prise_en_charge: item.commentaire_prise_en_charge ?? null,
            commentaire_cloture: item.commentaire_cloture ?? null,
        };
    }
};
exports.SignalementsService = SignalementsService;
exports.SignalementsService = SignalementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SignalementsService);
//# sourceMappingURL=signalements.service.js.map