export const ROLE_IDS = {
  DIRECTEUR_COMPOSANTE: 'directeur-composante',
  DIRECTEUR_ADMINISTRATIF: 'directeur-administratif',
  DIRECTEUR_ADMINISTRATIF_ADJOINT: 'directeur-administratif-adjoint',
  DIRECTEUR_DEPARTEMENT: 'directeur-departement',
  DIRECTEUR_MENTION: 'directeur-mention',
  DIRECTEUR_SPECIALITE: 'directeur-specialite',
  RESPONSABLE_FORMATION: 'responsable-formation',
  RESPONSABLE_ANNEE: 'responsable-annee',
  UTILISATEUR_SIMPLE: 'utilisateur-simple',
  LECTURE_SEULE: 'lecture-seule',
  ADMINISTRATEUR: 'administrateur',
  SERVICES_CENTRAUX: 'services-centraux',
} as const;

export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];
