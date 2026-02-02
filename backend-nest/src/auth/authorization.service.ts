import { Injectable } from '@nestjs/common';
import { ROLE_IDS } from './roles.constants';
import type { CurrentUser } from '../common/types/current-user';

@Injectable()
export class AuthorizationService {
  canRead(user: CurrentUser): boolean {
    return user.affectations.length > 0;
  }

  canWrite(user: CurrentUser): boolean {
    const restricted = new Set<string>([
      ROLE_IDS.UTILISATEUR_SIMPLE,
      ROLE_IDS.LECTURE_SEULE,
    ]);
    return this.hasAnyRole(user, this.allWriteRoles()).some(
      (role) => !restricted.has(role),
    );
  }

  canExport(user: CurrentUser): boolean {
    return this.hasAnyRole(user, [ROLE_IDS.SERVICES_CENTRAUX, ROLE_IDS.ADMINISTRATEUR]).length > 0;
  }

  canImport(user: CurrentUser): boolean {
    return this.canExport(user);
  }

  canDelegate(user: CurrentUser): boolean {
    return this.hasAnyRole(user, [
      ROLE_IDS.DIRECTEUR_COMPOSANTE,
      ROLE_IDS.DIRECTEUR_DEPARTEMENT,
      ROLE_IDS.DIRECTEUR_MENTION,
      ROLE_IDS.DIRECTEUR_SPECIALITE,
      ROLE_IDS.RESPONSABLE_FORMATION,
      ROLE_IDS.ADMINISTRATEUR,
    ]).length > 0;
  }

  canFreezeYear(user: CurrentUser): boolean {
    return this.hasAnyRole(user, [ROLE_IDS.SERVICES_CENTRAUX, ROLE_IDS.ADMINISTRATEUR]).length > 0;
  }

  private hasAnyRole(user: CurrentUser, roleIds: string[]): string[] {
    const userRoles = new Set(user.affectations.map((affectation) => affectation.roleId));
    return roleIds.filter((roleId) => userRoles.has(roleId));
  }

  private allWriteRoles(): string[] {
    return [
      ROLE_IDS.DIRECTEUR_COMPOSANTE,
      ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
      ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
      ROLE_IDS.DIRECTEUR_DEPARTEMENT,
      ROLE_IDS.DIRECTEUR_MENTION,
      ROLE_IDS.DIRECTEUR_SPECIALITE,
      ROLE_IDS.RESPONSABLE_FORMATION,
      ROLE_IDS.RESPONSABLE_ANNEE,
      ROLE_IDS.ADMINISTRATEUR,
      ROLE_IDS.SERVICES_CENTRAUX,
      ROLE_IDS.UTILISATEUR_SIMPLE,
      ROLE_IDS.LECTURE_SEULE,
    ];
  }
}
