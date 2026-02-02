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
exports.AffectationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let AffectationsService = class AffectationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(payload) {
        const created = await this.prisma.affectation.create({
            data: {
                id_user: BigInt(payload.id_user),
                id_role: payload.id_role,
                id_entite: BigInt(payload.id_entite),
                id_annee: BigInt(payload.id_annee),
                date_debut: new Date(payload.date_debut),
                date_fin: payload.date_fin ? new Date(payload.date_fin) : null,
            },
        });
        return {
            id_affectation: Number(created.id_affectation),
            id_user: Number(created.id_user),
            id_role: created.id_role,
            id_entite: Number(created.id_entite),
            id_annee: Number(created.id_annee),
            date_debut: created.date_debut.toISOString().slice(0, 10),
            date_fin: created.date_fin ? created.date_fin.toISOString().slice(0, 10) : null,
        };
    }
};
exports.AffectationsService = AffectationsService;
exports.AffectationsService = AffectationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AffectationsService);
//# sourceMappingURL=affectations.service.js.map