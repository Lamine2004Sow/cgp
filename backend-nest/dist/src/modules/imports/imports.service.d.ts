import { PrismaService } from '../../common/prisma/prisma.service';
import { ImportResponsablesDto } from './dto/import-responsables.dto';
export type ImportPreviewStatus = 'new_user' | 'update_user' | 'duplicate_affectation' | 'error';
export type ImportPreviewChange = {
    field: string;
    oldValue: string | null;
    newValue: string | null;
    major?: boolean;
};
export type ImportPreviewItem = {
    rowIndex: number;
    status: ImportPreviewStatus;
    login: string;
    nom: string;
    prenom: string;
    id_role: string;
    id_entite: number;
    id_annee: number;
    entiteNom?: string | null;
    roleLabel?: string | null;
    changes?: ImportPreviewChange[];
    error?: string;
};
export declare class ImportsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    previewResponsables(payload: ImportResponsablesDto): Promise<{
        items: ImportPreviewItem[];
        summary: {
            total: number;
            newUser: number;
            updateUser: number;
            duplicateAffectation: number;
            error: number;
        };
    }>;
    private computeUserChanges;
    private getRoleLabelMap;
    importResponsables(payload: ImportResponsablesDto, excludeIndices?: number[]): Promise<{
        imported_rows: number;
        created_users: number;
        created_affectations: number;
    }>;
    private upsertUser;
}
