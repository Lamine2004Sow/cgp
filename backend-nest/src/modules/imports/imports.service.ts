import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportResponsablesDto, type ImportResponsableRowDto } from './dto/import-responsables.dto';

@Injectable()
export class ImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async importResponsables(payload: ImportResponsablesDto) {
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

  private async upsertUser(
    tx: Prisma.TransactionClient,
    row: ImportResponsableRowDto,
  ): Promise<{ id: bigint; created: boolean }> {
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
}
