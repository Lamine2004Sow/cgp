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
exports.AnneesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AnneesService = class AnneesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(statut) {
        const items = await this.prisma.annee_universitaire.findMany({
            where: statut ? { statut: statut } : undefined,
            orderBy: { id_annee: 'asc' },
        });
        return items.map((item) => ({
            id_annee: Number(item.id_annee),
            libelle: item.libelle,
            date_debut: item.date_debut.toISOString().slice(0, 10),
            date_fin: item.date_fin.toISOString().slice(0, 10),
            statut: item.statut,
            id_annee_source: item.id_annee_source ? Number(item.id_annee_source) : null,
        }));
    }
    async cloneYear(sourceId, payload) {
        let parsedId;
        try {
            parsedId = BigInt(sourceId);
        }
        catch {
            parsedId = BigInt(0);
        }
        const created = await this.prisma.$transaction(async (tx) => {
            const year = await tx.annee_universitaire.create({
                data: {
                    libelle: payload.libelle,
                    date_debut: new Date(payload.date_debut),
                    date_fin: new Date(payload.date_fin),
                    statut: payload.statut,
                    id_annee_source: parsedId > 0 ? parsedId : null,
                },
            });
            if (parsedId > 0) {
                const sourceEntites = await tx.entite_structure.findMany({
                    where: { id_annee: parsedId },
                    orderBy: { id_entite: 'asc' },
                });
                const entiteMap = new Map();
                for (const sourceEntite of sourceEntites) {
                    const mappedParent = sourceEntite.id_entite_parent
                        ? (entiteMap.get(String(sourceEntite.id_entite_parent)) ?? null)
                        : null;
                    const clonedEntite = await tx.entite_structure.create({
                        data: {
                            id_annee: year.id_annee,
                            id_entite_parent: mappedParent,
                            type_entite: sourceEntite.type_entite,
                            nom: sourceEntite.nom,
                            tel_service: sourceEntite.tel_service,
                            bureau_service: sourceEntite.bureau_service,
                        },
                    });
                    entiteMap.set(String(sourceEntite.id_entite), clonedEntite.id_entite);
                }
                if (payload.copy_affectations) {
                    const sourceAffectations = await tx.affectation.findMany({
                        where: { id_annee: parsedId },
                        orderBy: { id_affectation: 'asc' },
                    });
                    for (const sourceAffectation of sourceAffectations) {
                        const clonedEntiteId = entiteMap.get(String(sourceAffectation.id_entite));
                        if (!clonedEntiteId) {
                            continue;
                        }
                        await tx.affectation.create({
                            data: {
                                id_user: sourceAffectation.id_user,
                                id_role: sourceAffectation.id_role,
                                id_entite: clonedEntiteId,
                                id_annee: year.id_annee,
                                date_debut: sourceAffectation.date_debut,
                                date_fin: sourceAffectation.date_fin,
                            },
                        });
                    }
                }
            }
            return year;
        });
        return {
            id_annee: Number(created.id_annee),
            libelle: created.libelle,
            date_debut: created.date_debut.toISOString().slice(0, 10),
            date_fin: created.date_fin.toISOString().slice(0, 10),
            statut: created.statut,
            id_annee_source: created.id_annee_source ? Number(created.id_annee_source) : null,
        };
    }
    async updateStatus(id, statut) {
        if (!['EN_COURS', 'PREPARATION', 'ARCHIVEE'].includes(statut)) {
            throw new common_1.BadRequestException('Invalid statut');
        }
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Year not found');
        }
        const updated = await this.prisma.$transaction(async (tx) => {
            const exists = await tx.annee_universitaire.findUnique({
                where: { id_annee: parsedId },
            });
            if (!exists) {
                throw new common_1.NotFoundException('Year not found');
            }
            if (statut === 'EN_COURS') {
                await tx.annee_universitaire.updateMany({
                    where: {
                        id_annee: { not: parsedId },
                        statut: 'EN_COURS',
                    },
                    data: {
                        statut: 'ARCHIVEE',
                    },
                });
            }
            return tx.annee_universitaire.update({
                where: { id_annee: parsedId },
                data: { statut: statut },
            });
        });
        return {
            id_annee: Number(updated.id_annee),
            libelle: updated.libelle,
            date_debut: updated.date_debut.toISOString().slice(0, 10),
            date_fin: updated.date_fin.toISOString().slice(0, 10),
            statut: updated.statut,
            id_annee_source: updated.id_annee_source ? Number(updated.id_annee_source) : null,
        };
    }
};
exports.AnneesService = AnneesService;
exports.AnneesService = AnneesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnneesService);
//# sourceMappingURL=annees.service.js.map