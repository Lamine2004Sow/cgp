export declare class ImportResponsableRowDto {
    login: string;
    nom: string;
    prenom: string;
    email_institutionnel?: string | null;
    telephone?: string | null;
    bureau?: string | null;
    id_role: string;
    id_entite: number;
    id_annee: number;
    date_debut: string;
    date_fin?: string | null;
}
export declare class ImportResponsablesDto {
    rows: ImportResponsableRowDto[];
}
