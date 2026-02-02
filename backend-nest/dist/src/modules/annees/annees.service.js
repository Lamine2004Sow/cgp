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
        const created = await this.prisma.annee_universitaire.create({
            data: {
                libelle: payload.libelle,
                date_debut: new Date(payload.date_debut),
                date_fin: new Date(payload.date_fin),
                statut: payload.statut,
                id_annee_source: parsedId > 0 ? parsedId : null,
            },
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
};
exports.AnneesService = AnneesService;
exports.AnneesService = AnneesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnneesService);
//# sourceMappingURL=annees.service.js.map