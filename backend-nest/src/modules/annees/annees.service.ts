import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CloneYearDto } from './dto/clone-year.dto';

@Injectable()
export class AnneesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(statut?: string) {
    const items = await this.prisma.annee_universitaire.findMany({
      where: statut ? { statut: statut as any } : undefined,
      orderBy: { id_annee: 'asc' },
    });

    return items.map((item) => ({
      id_annee: Number(item.id_annee),
      libelle: item.libelle,
      date_debut: item.date_debut.toISOString().slice(0, 10),
      date_fin: item.date_fin.toISOString().slice(0, 10),
      statut: item.statut,
      id_annee_source: item.id_annee_source ? Number(item.id_annee_source) : null,
    }));
  }

  async cloneYear(sourceId: string, payload: CloneYearDto) {
    let parsedId: bigint;
    try {
      parsedId = BigInt(sourceId);
    } catch {
      parsedId = BigInt(0);
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const year = await tx.annee_universitaire.create({
        data: {
          libelle: payload.libelle,
          date_debut: new Date(payload.date_debut),
          date_fin: new Date(payload.date_fin),
          statut: payload.statut as any,
          id_annee_source: parsedId > 0 ? parsedId : null,
        },
      });

      if (parsedId > 0) {
        const sourceEntites = await tx.entite_structure.findMany({
          where: { id_annee: parsedId },
          orderBy: { id_entite: 'asc' },
        });

        const entiteMap = new Map<string, bigint>();
        for (const sourceEntite of sourceEntites) {
          const mappedParent = sourceEntite.id_entite_parent
            ? (entiteMap.get(String(sourceEntite.id_entite_parent)) ?? null)
            : null;

          const clonedEntite = await tx.entite_structure.create({
            data: {
              id_annee: year.id_annee,
              id_entite_parent: mappedParent,
              type_entite: sourceEntite.type_entite,
              nom: sourceEntite.nom,
              tel_service: sourceEntite.tel_service,
              bureau_service: sourceEntite.bureau_service,
            },
          });

          entiteMap.set(String(sourceEntite.id_entite), clonedEntite.id_entite);
        }

        if (payload.copy_affectations) {
          const sourceAffectations = await tx.affectation.findMany({
            where: { id_annee: parsedId },
            orderBy: { id_affectation: 'asc' },
          });

          for (const sourceAffectation of sourceAffectations) {
            const clonedEntiteId = entiteMap.get(String(sourceAffectation.id_entite));
            if (!clonedEntiteId) {
              continue;
            }

            await tx.affectation.create({
              data: {
                id_user: sourceAffectation.id_user,
                id_role: sourceAffectation.id_role,
                id_entite: clonedEntiteId,
                id_annee: year.id_annee,
                date_debut: sourceAffectation.date_debut,
                date_fin: sourceAffectation.date_fin,
              },
            });
          }
        }
      }

      return year;
    });

    return {
      id_annee: Number(created.id_annee),
      libelle: created.libelle,
      date_debut: created.date_debut.toISOString().slice(0, 10),
      date_fin: created.date_fin.toISOString().slice(0, 10),
      statut: created.statut,
      id_annee_source: created.id_annee_source ? Number(created.id_annee_source) : null,
    };
  }

  async updateStatus(id: string, statut: string) {
    if (!['EN_COURS', 'PREPARATION', 'ARCHIVEE'].includes(statut)) {
      throw new BadRequestException('Invalid statut');
    }

    let parsedId: bigint;
    try {
      parsedId = BigInt(id);
    } catch {
      throw new NotFoundException('Year not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const exists = await tx.annee_universitaire.findUnique({
        where: { id_annee: parsedId },
      });
      if (!exists) {
        throw new NotFoundException('Year not found');
      }

      if (statut === 'EN_COURS') {
        await tx.annee_universitaire.updateMany({
          where: {
            id_annee: { not: parsedId },
            statut: 'EN_COURS',
          },
          data: {
            statut: 'ARCHIVEE',
          },
        });
      }

      return tx.annee_universitaire.update({
        where: { id_annee: parsedId },
        data: { statut: statut as any },
      });
    });

    return {
      id_annee: Number(updated.id_annee),
      libelle: updated.libelle,
      date_debut: updated.date_debut.toISOString().slice(0, 10),
      date_fin: updated.date_fin.toISOString().slice(0, 10),
      statut: updated.statut,
      id_annee_source: updated.id_annee_source ? Number(updated.id_annee_source) : null,
    };
  }
}
