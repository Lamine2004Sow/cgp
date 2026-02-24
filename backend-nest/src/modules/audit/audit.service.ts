import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizePagination } from '../../common/utils/pagination';
import { AuditListQueryDto } from './dto/audit-list-query.dto';

interface AuditLogInput {
  userId?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  oldValue?: string;
  newValue?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditLogInput): Promise<void> {
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

  async list(query: AuditListQueryDto) {
    const { page, pageSize, skip } = normalizePagination({
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

  async exportCsv(query: AuditListQueryDto): Promise<string> {
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
      .map((item) =>
        [
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
          .join(','),
      )
      .join('\n');

    return `${header}\n${body}`;
  }

  private buildWhere(query: AuditListQueryDto) {
    const startDate =
      query.startDate && !Number.isNaN(Date.parse(query.startDate))
        ? new Date(query.startDate)
        : undefined;
    const endDate =
      query.endDate && !Number.isNaN(Date.parse(query.endDate))
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
}
