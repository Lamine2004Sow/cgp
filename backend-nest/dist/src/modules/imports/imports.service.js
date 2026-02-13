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
exports.ImportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
let ImportsService = class ImportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async importResponsables(payload) {
        let createdUsers = 0;
        let createdAffectations = 0;
        await this.prisma.$transaction(async (tx) => {
            for (const row of payload.rows) {
                const userResult = await this.upsertUser(tx, row);
                if (userResult.created) {
                    createdUsers += 1;
                }
                const exists = await tx.affectation.findFirst({
                    where: {
                        id_user: userResult.id,
                        id_role: row.id_role,
                        id_entite: BigInt(row.id_entite),
                        id_annee: BigInt(row.id_annee),
                    },
                });
                if (!exists) {
                    await tx.affectation.create({
                        data: {
                            id_user: userResult.id,
                            id_role: row.id_role,
                            id_entite: BigInt(row.id_entite),
                            id_annee: BigInt(row.id_annee),
                            date_debut: new Date(row.date_debut),
                            date_fin: row.date_fin ? new Date(row.date_fin) : null,
                        },
                    });
                    createdAffectations += 1;
                }
            }
        });
        return {
            imported_rows: payload.rows.length,
            created_users: createdUsers,
            created_affectations: createdAffectations,
        };
    }
    async upsertUser(tx, row) {
        const existing = await tx.utilisateur.findUnique({
            where: { login: row.login },
            select: { id_user: true },
        });
        if (existing) {
            await tx.utilisateur.update({
                where: { id_user: existing.id_user },
                data: {
                    nom: row.nom,
                    prenom: row.prenom,
                    email_institutionnel: row.email_institutionnel ?? null,
                    telephone: row.telephone ?? null,
                    bureau: row.bureau ?? null,
                },
            });
            return { id: existing.id_user, created: false };
        }
        const created = await tx.utilisateur.create({
            data: {
                login: row.login,
                nom: row.nom,
                prenom: row.prenom,
                email_institutionnel: row.email_institutionnel ?? null,
                telephone: row.telephone ?? null,
                bureau: row.bureau ?? null,
            },
            select: { id_user: true },
        });
        return { id: created.id_user, created: true };
    }
};
exports.ImportsService = ImportsService;
exports.ImportsService = ImportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ImportsService);
//# sourceMappingURL=imports.service.js.map