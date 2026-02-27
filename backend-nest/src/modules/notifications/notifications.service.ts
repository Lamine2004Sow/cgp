import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';
import type { CurrentUser } from '../../common/types/current-user';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: CurrentUser, page?: number, pageSize?: number) {
    const { page: p, pageSize: ps, skip } = normalizePagination({ page, pageSize });

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

  async markAsRead(user: CurrentUser, id: string) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Notification introuvable');
    }

    const notif = await this.prisma.notification.findFirst({
      where: {
        id_notif: parsedId,
        destinataire_id: BigInt(user.userId),
      },
    });

    if (!notif) {
      throw new NotFoundException('Notification introuvable');
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
}
