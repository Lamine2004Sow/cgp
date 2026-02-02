export declare const ROLE_IDS: {
    readonly DIRECTEUR_COMPOSANTE: "directeur-composante";
    readonly DIRECTEUR_ADMINISTRATIF: "directeur-administratif";
    readonly DIRECTEUR_ADMINISTRATIF_ADJOINT: "directeur-administratif-adjoint";
    readonly DIRECTEUR_DEPARTEMENT: "directeur-departement";
    readonly DIRECTEUR_MENTION: "directeur-mention";
    readonly DIRECTEUR_SPECIALITE: "directeur-specialite";
    readonly RESPONSABLE_FORMATION: "responsable-formation";
    readonly RESPONSABLE_ANNEE: "responsable-annee";
    readonly UTILISATEUR_SIMPLE: "utilisateur-simple";
    readonly LECTURE_SEULE: "lecture-seule";
    readonly ADMINISTRATEUR: "administrateur";
    readonly SERVICES_CENTRAUX: "services-centraux";
};
export type RoleId = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];
