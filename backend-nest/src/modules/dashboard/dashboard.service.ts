import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

const RESPONSABLE_ROLE_IDS = [
  'directeur-composante',
  'directeur-administratif',
  'directeur-administratif-adjoint',
  'directeur-departement',
  'directeur-mention',
  'directeur-specialite',
  'responsable-formation',
  'responsable-annee',
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(yearId?: number) {
    const year = await this.resolveYear(yearId);
    if (!year) {
      throw new NotFoundException('Aucune année disponible.');
    }

    const [niveauCount, fallbackFormationCount, responsablesRows, departements, composantes] =
      await this.prisma.$transaction([
        this.prisma.entite_structure.count({
          where: {
            id_annee: year.id_annee,
            type_entite: 'NIVEAU',
          },
        }),
        this.prisma.entite_structure.count({
          where: {
            id_annee: year.id_annee,
            type_entite: { in: ['MENTION', 'PARCOURS'] },
          },
        }),
        this.prisma.affectation.findMany({
          where: {
            id_annee: year.id_annee,
            id_role: { in: RESPONSABLE_ROLE_IDS },
          },
          distinct: ['id_user'],
          select: { id_user: true },
        }),
        this.prisma.entite_structure.count({
          where: {
            id_annee: year.id_annee,
            type_entite: 'DEPARTEMENT',
          },
        }),
        this.prisma.entite_structure.count({
          where: {
            id_annee: year.id_annee,
            type_entite: 'COMPOSANTE',
          },
        }),
      ]);

    return {
      yearId: Number(year.id_annee),
      yearLabel: year.libelle,
      formations: niveauCount > 0 ? niveauCount : fallbackFormationCount,
      responsables: responsablesRows.length,
      departements,
      composantes,
    };
  }

  private async resolveYear(yearId?: number) {
    if (yearId) {
      const item = await this.prisma.annee_universitaire.findUnique({
        where: { id_annee: BigInt(yearId) },
      });
      if (!item) {
        throw new NotFoundException('Année introuvable.');
      }
      return item;
    }

    const current = await this.prisma.annee_universitaire.findFirst({
      where: { statut: 'EN_COURS' },
      orderBy: { id_annee: 'desc' },
    });

    if (current) {
      return current;
    }

    return this.prisma.annee_universitaire.findFirst({
      orderBy: { id_annee: 'desc' },
    });
  }
}
