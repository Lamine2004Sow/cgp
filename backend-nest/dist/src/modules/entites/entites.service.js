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
exports.EntitesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let EntitesService = class EntitesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(yearId) {
        const items = await this.prisma.entite_structure.findMany({
            where: yearId ? { id_annee: BigInt(yearId) } : undefined,
            orderBy: { id_entite: 'asc' },
        });
        return items.map((item) => ({
            id_entite: Number(item.id_entite),
            id_annee: Number(item.id_annee),
            id_entite_parent: item.id_entite_parent ? Number(item.id_entite_parent) : null,
            type_entite: item.type_entite,
            nom: item.nom,
            tel_service: item.tel_service,
            bureau_service: item.bureau_service,
        }));
    }
};
exports.EntitesService = EntitesService;
exports.EntitesService = EntitesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EntitesService);
//# sourceMappingURL=entites.service.js.map