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
exports.DashboardService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const NON_RESPONSABLE_ROLES = [
    'services-centraux',
    'administrateur',
    'utilisateur-simple',
    'lecture-seule',
];
let DashboardService = class DashboardService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(yearId) {
        const year = await this.resolveYear(yearId);
        if (!year) {
            throw new common_1.NotFoundException('Aucune année disponible.');
        }
        const [formationCount, responsablesRows, departements, composantes] = await this.prisma.$transaction([
            this.prisma.entite_structure.count({
                where: {
                    id_annee: year.id_annee,
                    type_entite: { in: ['MENTION', 'PARCOURS', 'NIVEAU'] },
                },
            }),
            this.prisma.affectation.findMany({
                where: {
                    id_annee: year.id_annee,
                    id_role: { notIn: NON_RESPONSABLE_ROLES },
                },
                distinct: ['id_user'],
                select: { id_user: true },
            }),
            this.prisma.entite_structure.count({
                where: {
                    id_annee: year.id_annee,
                    type_entite: 'DEPARTEMENT',
                },
            }),
            this.prisma.entite_structure.count({
                where: {
                    id_annee: year.id_annee,
                    type_entite: 'COMPOSANTE',
                },
            }),
        ]);
        return {
            yearId: Number(year.id_annee),
            yearLabel: year.libelle,
            formations: formationCount,
            responsables: responsablesRows.length,
            departements,
            composantes,
        };
    }
    async resolveYear(yearId) {
        if (yearId) {
            const item = await this.prisma.annee_universitaire.findUnique({
                where: { id_annee: BigInt(yearId) },
            });
            if (!item) {
                throw new common_1.NotFoundException('Année introuvable.');
            }
            return item;
        }
        const current = await this.prisma.annee_universitaire.findFirst({
            where: { statut: 'EN_COURS' },
            orderBy: { id_annee: 'desc' },
        });
        if (current) {
            return current;
        }
        return this.prisma.annee_universitaire.findFirst({
            orderBy: { id_annee: 'desc' },
        });
    }
};
exports.DashboardService = DashboardService;
exports.DashboardService = DashboardService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DashboardService);
//# sourceMappingURL=dashboard.service.js.map