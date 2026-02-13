import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportResponsables(params: {
    yearId?: number;
    entiteId?: number;
    roleId?: string;
  }) {
    const where = {
      ...(params.yearId ? { id_annee: BigInt(params.yearId) } : {}),
      ...(params.entiteId ? { id_entite: BigInt(params.entiteId) } : {}),
      ...(params.roleId ? { id_role: params.roleId } : {}),
    };

    const affectations = await this.prisma.affectation.findMany({
      where: Object.keys(where).length ? where : undefined,
      include: {
        utilisateur: true,
        role: true,
        entite_structure: true,
      },
    });

    return affectations.map((affectation) => ({
      nom: affectation.utilisateur.nom,
      prenom: affectation.utilisateur.prenom,
      email_institutionnel: affectation.utilisateur.email_institutionnel,
      role: affectation.role?.libelle ?? affectation.id_role,
      entite: affectation.entite_structure?.nom ?? `Entite ${affectation.id_entite}`,
      id_annee: Number(affectation.id_annee),
    }));
  }
}
