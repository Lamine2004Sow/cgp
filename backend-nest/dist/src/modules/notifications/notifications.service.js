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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../common/prisma/prisma.service");
const pagination_1 = require("../../common/utils/pagination");
let NotificationsService = class NotificationsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(user, page, pageSize) {
        const { page: p, pageSize: ps, skip } = (0, pagination_1.normalizePagination)({ page, pageSize });
        const where = { destinataire_id: BigInt(user.userId) };
        const [items, total] = await this.prisma.$transaction([
            this.prisma.notification.findMany({
                where,
                orderBy: { date_envoi: 'desc' },
                skip,
                take: ps,
            }),
            this.prisma.notification.count({ where }),
        ]);
        return {
            items: items.map((n) => ({
                id_notif: Number(n.id_notif),
                message: n.message,
                lu: n.lu,
                date_envoi: n.date_envoi.toISOString(),
                id_demande: n.id_demande ? Number(n.id_demande) : null,
                id_signalement: n.id_signalement ? Number(n.id_signalement) : null,
                id_demande_role: n.id_demande_role ? Number(n.id_demande_role) : null,
            })),
            page: p,
            pageSize: ps,
            total,
        };
    }
    async markAsRead(user, id) {
        let parsedId;
        try {
            parsedId = BigInt(id);
        }
        catch {
            throw new common_1.NotFoundException('Notification introuvable');
        }
        const notif = await this.prisma.notification.findFirst({
            where: {
                id_notif: parsedId,
                destinataire_id: BigInt(user.userId),
            },
        });
        if (!notif) {
            throw new common_1.NotFoundException('Notification introuvable');
        }
        const updated = await this.prisma.notification.update({
            where: { id_notif: parsedId },
            data: { lu: true },
        });
        return {
            id_notif: Number(updated.id_notif),
            message: updated.message,
            lu: updated.lu,
            date_envoi: updated.date_envoi.toISOString(),
        };
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map