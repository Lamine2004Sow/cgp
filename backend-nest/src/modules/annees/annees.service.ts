import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { StandardWorkbookService } from '../exports/standard-workbook.service';
import { CloneYearDto } from './dto/clone-year.dto';

@Injectable()
export class AnneesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly standardWorkbookService: StandardWorkbookService,
  ) {}

  async findOne(id: string) {
    const parsedId = this.parseYearId(id);
    const item = await this.prisma.annee_universitaire.findUnique({
      where: { id_annee: parsedId },
    });

    if (!item) {
      throw new NotFoundException('Year not found');
    }

    return this.mapYear(item);
  }

  async list(statut?: string) {
    const items = await this.prisma.annee_universitaire.findMany({
      where: statut ? { statut: statut as never } : undefined,
      orderBy: { id_annee: 'asc' },
    });

    return items.map((item) => this.mapYear(item));
  }

  async cloneYear(sourceId: string, payload: CloneYearDto) {
    const parsedSourceId = sourceId === '0' ? BigInt(0) : this.parseOptionalYearId(sourceId);

    const created = await this.prisma.$transaction(async (tx) => {
      await this.ensureYearLabelAvailable(tx, payload.libelle);

      const year = await tx.annee_universitaire.create({
        data: {
          libelle: payload.libelle,
          date_debut: new Date(payload.date_debut),
          date_fin: new Date(payload.date_fin),
          statut: payload.statut as never,
          id_annee_source: parsedSourceId && parsedSourceId > 0 ? parsedSourceId : null,
        },
      });

      if (!parsedSourceId || parsedSourceId <= 0) {
        return year;
      }

      const sourceScope = await this.collectCloneScope(
        tx,
        Number(parsedSourceId),
        payload.root_entite_ids ?? [],
      );

      const sourceEntites = await tx.entite_structure.findMany({
        where: {
          id_annee: parsedSourceId,
          id_entite: { in: Array.from(sourceScope.entiteIds).map((id) => BigInt(id)) },
        },
        orderBy: { id_entite: 'asc' },
        include: {
          composante: true,
          departement: true,
          mention: true,
          parcours: true,
          niveau: true,
        },
      });

      const entiteMap = new Map<number, bigint>();

      for (const sourceEntite of sourceEntites) {
        const sourceParentId = sourceEntite.id_entite_parent
          ? Number(sourceEntite.id_entite_parent)
          : null;
        const clonedParentId =
          sourceParentId != null ? entiteMap.get(sourceParentId) ?? null : null;

        const clonedEntite = await tx.entite_structure.create({
          data: {
            id_annee: year.id_annee,
            id_entite_parent: clonedParentId,
            type_entite: sourceEntite.type_entite,
            nom: sourceEntite.nom,
            tel_service: sourceEntite.tel_service,
            bureau_service: sourceEntite.bureau_service,
          },
        });

        entiteMap.set(Number(sourceEntite.id_entite), clonedEntite.id_entite);
        await this.cloneEntiteSubtype(tx, sourceEntite, clonedEntite.id_entite);
      }

      if (payload.copy_affectations) {
        const sourceAffectations = await tx.affectation.findMany({
          where: {
            id_annee: parsedSourceId,
            id_entite: { in: Array.from(sourceScope.entiteIds).map((id) => BigInt(id)) },
          },
          orderBy: { id_affectation: 'asc' },
          include: { contact_role: true },
        });

        const affectationMap = new Map<number, bigint>();

        for (const sourceAffectation of sourceAffectations) {
          const clonedEntiteId = entiteMap.get(Number(sourceAffectation.id_entite));
          if (!clonedEntiteId) {
            continue;
          }

          const clonedAffectation = await tx.affectation.create({
            data: {
              id_user: sourceAffectation.id_user,
              id_role: sourceAffectation.id_role,
              id_entite: clonedEntiteId,
              id_annee: year.id_annee,
              date_debut: sourceAffectation.date_debut,
              date_fin: sourceAffectation.date_fin,
            },
          });

          affectationMap.set(
            Number(sourceAffectation.id_affectation),
            clonedAffectation.id_affectation,
          );

          for (const contact of sourceAffectation.contact_role) {
            await tx.contact_role.create({
              data: {
                id_affectation: clonedAffectation.id_affectation,
                email_fonctionnelle: contact.email_fonctionnelle,
                type_email: contact.type_email,
                telephone: contact.telephone,
                bureau: contact.bureau,
              },
            });
          }
        }

        for (const sourceAffectation of sourceAffectations) {
          if (!sourceAffectation.id_affectation_n_plus_1) {
            continue;
          }

          const clonedAffectationId = affectationMap.get(
            Number(sourceAffectation.id_affectation),
          );
          const clonedSupervisorId = affectationMap.get(
            Number(sourceAffectation.id_affectation_n_plus_1),
          );

          if (!clonedAffectationId || !clonedSupervisorId) {
            continue;
          }

          await tx.affectation.update({
            where: { id_affectation: clonedAffectationId },
            data: { id_affectation_n_plus_1: clonedSupervisorId },
          });
        }
      }

      return year;
    });

    return this.mapYear(created);
  }

  async updateStatus(id: string, statut: string) {
    if (!['EN_COURS', 'PREPARATION', 'ARCHIVEE'].includes(statut)) {
      throw new BadRequestException('Invalid statut');
    }

    const parsedId = this.parseYearId(id);

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
        data: { statut: statut as never },
      });
    });

    return this.mapYear(updated);
  }

  async deleteYear(id: string) {
    const parsedId = this.parseYearId(id);
    const existing = await this.prisma.annee_universitaire.findUnique({
      where: { id_annee: parsedId },
    });

    if (!existing) {
      throw new NotFoundException('Year not found');
    }

    const workbook = await this.standardWorkbookService.buildWorkbookPayload({
      yearId: Number(parsedId),
    });
    const backup = this.standardWorkbookService.toDownload(
      `backup-${existing.libelle.replace(/[^a-zA-Z0-9_-]+/g, '-')}.xml`,
      workbook,
    );

    await this.prisma.$transaction(async (tx) => {
      const entites = await tx.entite_structure.findMany({
        where: { id_annee: parsedId },
        select: { id_entite: true },
      });
      const entiteIds = entites.map((item) => item.id_entite);

      const signalements = entiteIds.length
        ? await tx.signalement.findMany({
            where: { id_entite_cible: { in: entiteIds } },
            select: { id_signalement: true },
          })
        : [];

      if (signalements.length > 0) {
        await tx.notification.deleteMany({
          where: {
            id_signalement: {
              in: signalements.map((item) => item.id_signalement),
            },
          },
        });
      }

      await tx.organigramme.deleteMany({ where: { id_annee: parsedId } });

      if (entiteIds.length > 0) {
        await tx.delegation.deleteMany({
          where: { id_entite: { in: entiteIds } },
        });
        await tx.signalement.deleteMany({
          where: { id_entite_cible: { in: entiteIds } },
        });
        await tx.role.updateMany({
          where: { id_composante: { in: entiteIds } },
          data: { id_composante: null },
        });
      }

      await tx.affectation.deleteMany({ where: { id_annee: parsedId } });
      await tx.annee_universitaire.updateMany({
        where: { id_annee_source: parsedId },
        data: { id_annee_source: null },
      });
      await tx.entite_structure.deleteMany({ where: { id_annee: parsedId } });
      await tx.annee_universitaire.delete({ where: { id_annee: parsedId } });

      if (existing.statut === 'EN_COURS') {
        const replacement = await tx.annee_universitaire.findFirst({
          orderBy: { id_annee: 'desc' },
        });
        if (replacement) {
          await tx.annee_universitaire.update({
            where: { id_annee: replacement.id_annee },
            data: { statut: 'EN_COURS' },
          });
        }
      }
    });

    return {
      year: this.mapYear(existing),
      backup,
    };
  }

  private async collectCloneScope(
    tx: Prisma.TransactionClient,
    sourceYearId: number,
    rootEntiteIds: number[],
  ): Promise<{ entiteIds: Set<number> }> {
    const entites = await tx.entite_structure.findMany({
      where: { id_annee: BigInt(sourceYearId) },
      select: {
        id_entite: true,
        id_entite_parent: true,
      },
      orderBy: { id_entite: 'asc' },
    });

    if (rootEntiteIds.length === 0) {
      return {
        entiteIds: new Set(entites.map((item) => Number(item.id_entite))),
      };
    }

    const childrenByParent = new Map<number, number[]>();
    const parentById = new Map<number, number | null>();

    entites.forEach((item) => {
      const id = Number(item.id_entite);
      const parentId = item.id_entite_parent ? Number(item.id_entite_parent) : null;
      parentById.set(id, parentId);
      if (parentId == null) {
        return;
      }
      const list = childrenByParent.get(parentId) ?? [];
      list.push(id);
      childrenByParent.set(parentId, list);
    });

    const scope = new Set<number>();

    rootEntiteIds.forEach((rootId) => {
      let currentId: number | null = parentById.get(rootId) ?? null;
      while (currentId != null && !scope.has(currentId)) {
        scope.add(currentId);
        currentId = parentById.get(currentId) ?? null;
      }

      const queue = [rootId];
      while (queue.length > 0) {
        const current = queue.shift();
        if (current == null) {
          continue;
        }
        if (scope.has(current)) {
          (childrenByParent.get(current) ?? []).forEach((childId) => {
            if (!scope.has(childId)) {
              queue.push(childId);
            }
          });
          continue;
        }
        scope.add(current);
        (childrenByParent.get(current) ?? []).forEach((childId) => queue.push(childId));
      }
    });

    return { entiteIds: scope };
  }

  private async cloneEntiteSubtype(
    tx: Prisma.TransactionClient,
    sourceEntite: {
      id_entite: bigint;
      type_entite: string;
      composante: {
        code_composante: string | null;
        type_composante: any;
        site_web: string | null;
        mail_fonctionnel: string | null;
        mail_institutionnel: string | null;
        campus: string | null;
      } | null;
      departement: { code_interne: string | null } | null;
      mention: {
        type_diplome: string | null;
        cycle: number | null;
        id_type_diplome: bigint | null;
      } | null;
      parcours: { code_parcours: string | null } | null;
      niveau: { libelle_court: string | null } | null;
    },
    targetEntiteId: bigint,
  ) {
    if (sourceEntite.composante) {
      await tx.composante.create({
        data: {
          id_entite: targetEntiteId,
          code_composante: sourceEntite.composante.code_composante,
          type_composante: sourceEntite.composante.type_composante,
          site_web: sourceEntite.composante.site_web,
          mail_fonctionnel: sourceEntite.composante.mail_fonctionnel,
          mail_institutionnel: sourceEntite.composante.mail_institutionnel,
          campus: sourceEntite.composante.campus,
        },
      });
    }

    if (sourceEntite.departement) {
      await tx.departement.create({
        data: {
          id_entite: targetEntiteId,
          code_interne: sourceEntite.departement.code_interne,
        },
      });
    }

    if (sourceEntite.mention) {
      await tx.mention.create({
        data: {
          id_entite: targetEntiteId,
          type_diplome: sourceEntite.mention.type_diplome,
          cycle: sourceEntite.mention.cycle,
          id_type_diplome: sourceEntite.mention.id_type_diplome,
        },
      });
    }

    if (sourceEntite.parcours) {
      await tx.parcours.create({
        data: {
          id_entite: targetEntiteId,
          code_parcours: sourceEntite.parcours.code_parcours,
        },
      });
    }

    if (sourceEntite.niveau) {
      await tx.niveau.create({
        data: {
          id_entite: targetEntiteId,
          libelle_court: sourceEntite.niveau.libelle_court,
        },
      });
    }
  }

  private async ensureYearLabelAvailable(
    tx: Prisma.TransactionClient,
    libelle: string,
  ) {
    const exists = await tx.annee_universitaire.findFirst({
      where: { libelle },
      select: { id_annee: true },
    });

    if (exists) {
      throw new BadRequestException("Une année avec ce libellé existe déjà");
    }
  }

  private parseYearId(id: string): bigint {
    try {
      return BigInt(id);
    } catch {
      throw new NotFoundException('Year not found');
    }
  }

  private parseOptionalYearId(id: string): bigint | null {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  }

  private mapYear(item: {
    id_annee: bigint;
    libelle: string;
    date_debut: Date;
    date_fin: Date;
    statut: string;
    id_annee_source: bigint | null;
  }) {
    return {
      id_annee: Number(item.id_annee),
      libelle: item.libelle,
      date_debut: item.date_debut.toISOString().slice(0, 10),
      date_fin: item.date_fin.toISOString().slice(0, 10),
      statut: item.statut,
      id_annee_source: item.id_annee_source ? Number(item.id_annee_source) : null,
    };
  }
}
