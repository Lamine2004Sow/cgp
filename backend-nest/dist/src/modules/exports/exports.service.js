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
exports.ExportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const standard_workbook_service_1 = require("./standard-workbook.service");
let ExportsService = class ExportsService {
    prisma;
    standardWorkbookService;
    constructor(prisma, standardWorkbookService) {
        this.prisma = prisma;
        this.standardWorkbookService = standardWorkbookService;
    }
    async exportResponsables(params) {
        const where = {
            ...(params.yearId ? { id_annee: BigInt(params.yearId) } : {}),
            ...(params.entiteId ? { id_entite: BigInt(params.entiteId) } : {}),
            ...(params.roleId ? { id_role: params.roleId } : {}),
        };
        const affectations = await this.prisma.affectation.findMany({
            where: Object.keys(where).length ? where : undefined,
            include: {
                utilisateur: true,
                role: true,
                entite_structure: true,
            },
        });
        return affectations.map((affectation) => ({
            nom: affectation.utilisateur.nom,
            prenom: affectation.utilisateur.prenom,
            email_institutionnel: affectation.utilisateur.email_institutionnel,
            role: affectation.role?.libelle ?? affectation.id_role,
            entite: affectation.entite_structure?.nom ?? `Entite ${affectation.id_entite}`,
            id_annee: Number(affectation.id_annee),
        }));
    }
    async exportWorkbook(params) {
        const workbook = await this.standardWorkbookService.buildWorkbookPayload({
            yearId: params.yearId,
            entiteId: params.entiteId,
            template: params.template,
        });
        const yearLabel = workbook.meta.source_year_label || `annee-${params.yearId}`;
        const normalizedYearLabel = yearLabel.replace(/[^a-zA-Z0-9_-]+/g, '-');
        const scopeSuffix = params.entiteId ? `-entite-${params.entiteId}` : '';
        const prefix = params.template ? 'cgp-template' : 'cgp-export';
        return this.standardWorkbookService.toDownload(`${prefix}-${normalizedYearLabel}${scopeSuffix}.xml`, workbook);
    }
};
exports.ExportsService = ExportsService;
exports.ExportsService = ExportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        standard_workbook_service_1.StandardWorkbookService])
], ExportsService);
//# sourceMappingURL=exports.service.js.map