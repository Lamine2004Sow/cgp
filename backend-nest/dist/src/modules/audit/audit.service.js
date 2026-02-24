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
exports.AuditService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_1 = require("../../common/utils/pagination");
let AuditService = class AuditService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async log(input) {
        if (!input.userId || !input.action || !input.targetType) {
            return;
        }
        await this.prisma.journal_audit.create({
            data: {
                id_user_auteur: BigInt(input.userId),
                type_action: input.action,
                cible_type: input.targetType,
                cible_id: input.targetId ?? null,
                ancienne_valeur: input.oldValue ?? null,
                nouvelle_valeur: input.newValue ?? null,
            },
        });
    }
    async list(query) {
        const { page, pageSize, skip } = (0, pagination_1.normalizePagination)({
            page: query.page,
            pageSize: query.pageSize,
        });
        const where = this.buildWhere(query);
        const [items, total] = await this.prisma.$transaction([
            this.prisma.journal_audit.findMany({
                where,
                orderBy: { horodatage: 'desc' },
                skip,
                take: pageSize,
                include: {
                    utilisateur: {
                        select: {
                            login: true,
                            nom: true,
                            prenom: true,
                        },
                    },
                },
            }),
            this.prisma.journal_audit.count({ where }),
        ]);
        return {
            items: items.map((item) => ({
                id_log: Number(item.id_log),
                id_user_auteur: Number(item.id_user_auteur),
                horodatage: item.horodatage.toISOString(),
                type_action: item.type_action,
                cible_type: item.cible_type,
                cible_id: item.cible_id,
                ancienne_valeur: item.ancienne_valeur,
                nouvelle_valeur: item.nouvelle_valeur,
                auteur_login: item.utilisateur?.login ?? null,
                auteur_nom: item.utilisateur?.nom ?? null,
                auteur_prenom: item.utilisateur?.prenom ?? null,
            })),
            page,
            pageSize,
            total,
        };
    }
    async exportCsv(query) {
        const where = this.buildWhere(query);
        const items = await this.prisma.journal_audit.findMany({
            where,
            orderBy: { horodatage: 'desc' },
            include: {
                utilisateur: {
                    select: {
                        login: true,
                        nom: true,
                        prenom: true,
                    },
                },
            },
        });
        const header = [
            'id_log',
            'horodatage',
            'type_action',
            'cible_type',
            'cible_id',
            'auteur_login',
            'auteur_nom',
            'auteur_prenom',
        ].join(',');
        const body = items
            .map((item) => [
            Number(item.id_log),
            item.horodatage.toISOString(),
            item.type_action,
            item.cible_type,
            item.cible_id ?? '',
            item.utilisateur?.login ?? '',
            item.utilisateur?.nom ?? '',
            item.utilisateur?.prenom ?? '',
        ]
            .map((value) => `"${String(value).replace(/"/g, '""')}"`)
            .join(','))
            .join('\n');
        return `${header}\n${body}`;
    }
    buildWhere(query) {
        const startDate = query.startDate && !Number.isNaN(Date.parse(query.startDate))
            ? new Date(query.startDate)
            : undefined;
        const endDate = query.endDate && !Number.isNaN(Date.parse(query.endDate))
            ? new Date(query.endDate)
            : undefined;
        return {
            ...(query.userId ? { id_user_auteur: BigInt(query.userId) } : {}),
            ...(query.action ? { type_action: query.action } : {}),
            ...(query.targetType ? { cible_type: query.targetType } : {}),
            ...(query.targetId != null && query.targetId !== '' ? { cible_id: query.targetId } : {}),
            ...(startDate || endDate
                ? {
                    horodatage: {
                        ...(startDate ? { gte: startDate } : {}),
                        ...(endDate ? { lte: endDate } : {}),
                    },
                }
                : {}),
        };
    }
};
exports.AuditService = AuditService;
exports.AuditService = AuditService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuditService);
//# sourceMappingURL=audit.service.js.map