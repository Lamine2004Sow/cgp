import { PrismaService } from '../../common/prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user';
import { type StandardWorkbookSheetName } from '../exports/standard-workbook.service';
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
export type WorkbookPreviewStatus = 'create' | 'update' | 'reuse' | 'skip' | 'warning' | 'error';
export type WorkbookPreviewItem = {
    sheet: StandardWorkbookSheetName | 'meta';
    sourceKey: string;
    label: string;
    status: WorkbookPreviewStatus;
    detail: string;
};
export type WorkbookPreviewSummary = {
    total: number;
    create: number;
    update: number;
    reuse: number;
    skip: number;
    warning: number;
    error: number;
    targetYearId: number | null;
    targetYearLabel: string | null;
    targetYearWillBeCreated: boolean;
};
type WorkbookImportPayload = {
    workbook: unknown;
    targetYearId?: number;
    createTargetYear?: boolean;
    scopeSourceEntiteId?: number;
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
    importResponsables(payload: ImportResponsablesDto, excludeIndices?: number[]): Promise<{
        imported_rows: number;
        created_users: number;
        created_affectations: number;
    }>;
    previewWorkbook(user: CurrentUser, payload: WorkbookImportPayload): Promise<{
        items: WorkbookPreviewItem[];
        summary: WorkbookPreviewSummary;
        result: {
            targetYearId: number | null;
            targetYearLabel: string | null;
            processed: number;
        } | undefined;
    }>;
    importWorkbook(user: CurrentUser, payload: WorkbookImportPayload): Promise<{
        items: WorkbookPreviewItem[];
        summary: WorkbookPreviewSummary;
        result: {
            targetYearId: number | null;
            targetYearLabel: string | null;
            processed: number;
        } | undefined;
    }>;
    private processWorkbookImport;
    private normalizeWorkbookPayload;
    private filterWorkbookByScope;
    private sortStructureRows;
    private findExistingStructure;
    private collectStructureChanges;
    private applyStructureSubtype;
    private collectWorkbookUserChanges;
    private buildStructureMatchKey;
    private buildStructureGlobalKey;
    private buildAffectationKey;
    private buildDelegationKey;
    private buildSignalementKey;
    private buildOrganigrammeKey;
    private normalizeKey;
    private emptyToNull;
    private toUtilisateurGenre;
    private toUtilisateurCategorie;
    private toUtilisateurStatut;
    private toBoolean;
    private toNumber;
    private parseDate;
    private parseNullableDate;
    private parseDateTime;
    private parseNullableDateTime;
    private isServicesCentraux;
    private computeUserChanges;
    private getRoleLabelMap;
    private upsertUser;
}
export {};
