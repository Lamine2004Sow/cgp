export declare const SIGNALEMENT_TYPES: readonly ["ERREUR_INFO_PERSONNE", "MAUVAISE_AFFECTATION", "ERREUR_STRUCTURE", "ERREUR_MENTION", "AUTRE"];
export type SignalementType = (typeof SIGNALEMENT_TYPES)[number];
export declare class CreateSignalementDto {
    description: string;
    type_signalement?: SignalementType;
    id_entite_cible?: number | null;
    id_user_cible?: number | null;
}
