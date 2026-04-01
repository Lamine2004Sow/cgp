export declare const TYPE_DROIT_VALUES: readonly ["view", "manage_responsables", "assign_role", "validate_signalement", "generate_orgchart", "import_data", "full"];
export type TypeDroit = (typeof TYPE_DROIT_VALUES)[number];
export declare class CreateDelegationDto {
    delegataire_id: number;
    id_entite: number;
    id_role?: string | null;
    type_droit: TypeDroit;
    date_debut: string;
    date_fin?: string | null;
}
