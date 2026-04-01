import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { CurrentUser, CurrentUserAffectation } from '../common/types/current-user';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async buildCurrentUserByLogin(login: string): Promise<CurrentUser | null> {
    try {
      const user = await this.prisma.utilisateur.findUnique({
      where: { login },
      include: {
        affectation: {
          include: {
            role: true,
            entite_structure: true,
            annee_universitaire: true,
          },
        },
      },
    });

    if (!user) {
      return null;
    }

    return {
      userId: String(user.id_user),
      login: user.login,
      nom: user.nom,
      prenom: user.prenom,
      emailInstitutionnel: user.email_institutionnel,
      emailInstitutionnelSecondaire: user.email_institutionnel_secondaire,
      genre: user.genre,
      categorie: user.categorie,
      telephone: user.telephone,
      bureau: user.bureau,
      affectations: user.affectation.map((affectation) =>
        this.mapAffectation(affectation),
      ),
    };
    } catch (err) {
      const message =
        err && typeof (err as Error).message === 'string'
          ? (err as Error).message
          : 'Service indisponible';
      if (message.includes('connect') || message.includes('Connection')) {
        throw new HttpException(
          { message: 'Base de données indisponible. Vérifiez que le serveur et la base sont démarrés.' },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw new HttpException(
        { message: 'Erreur lors de la vérification de l\'utilisateur.' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapAffectation(affectation: {
    id_affectation: bigint;
    id_role: string;
    id_entite: bigint;
    id_annee: bigint;
    role: { libelle: string };
    entite_structure: { type_entite: string; nom: string };
    annee_universitaire: { libelle: string };
  }): CurrentUserAffectation {
    return {
      affectationId: String(affectation.id_affectation),
      roleId: affectation.id_role,
      roleLabel: affectation.role?.libelle ?? null,
      entiteId: String(affectation.id_entite),
      entiteType: affectation.entite_structure?.type_entite ?? null,
      entiteName: affectation.entite_structure?.nom ?? null,
      anneeId: String(affectation.id_annee),
      anneeLabel: affectation.annee_universitaire?.libelle ?? null,
    };
  }
}
