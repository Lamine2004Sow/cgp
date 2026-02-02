export interface CurrentUserAffectation {
  affectationId: string;
  roleId: string;
  roleLabel?: string | null;
  entiteId: string;
  entiteType?: string | null;
  entiteName?: string | null;
  anneeId: string;
  anneeLabel?: string | null;
}

export interface CurrentUser {
  userId: string;
  login: string;
  nom: string;
  prenom: string;
  emailInstitutionnel?: string | null;
  affectations: CurrentUserAffectation[];
}
