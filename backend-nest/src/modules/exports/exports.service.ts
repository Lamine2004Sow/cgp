import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ExportsService {
  constructor(private readonly prisma: PrismaService) {}

  async exportResponsables(yearId?: number) {
    const where = yearId ? { id_annee: BigInt(yearId) } : undefined;

    const affectations = await this.prisma.affectation.findMany({
      where,
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
