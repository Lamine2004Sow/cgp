import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { ImportsService } from './imports.service';
import { ImportResponsablesDto } from './dto/import-responsables.dto';
import { ImportConfirmDto } from './dto/import-confirm.dto';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    previewResponsables(payload: ImportResponsablesDto): Promise<{
        items: import("./imports.service").ImportPreviewItem[];
        summary: {
            total: number;
            newUser: number;
            updateUser: number;
            duplicateAffectation: number;
            error: number;
        };
    }>;
    confirmResponsables(payload: ImportConfirmDto): Promise<{
        result: {
            imported_rows: number;
            created_users: number;
            created_affectations: number;
        };
    }>;
    importResponsables(payload: ImportResponsablesDto): Promise<{
        result: {
            imported_rows: number;
            created_users: number;
            created_affectations: number;
        };
    }>;
    previewWorkbook(user: CurrentUserType, payload: any): Promise<{
        items: import("./imports.service").WorkbookPreviewItem[];
        summary: import("./imports.service").WorkbookPreviewSummary;
        result: {
            targetYearId: number | null;
            targetYearLabel: string | null;
            processed: number;
        } | undefined;
    }>;
    confirmWorkbook(user: CurrentUserType, payload: any): Promise<{
        items: import("./imports.service").WorkbookPreviewItem[];
        summary: import("./imports.service").WorkbookPreviewSummary;
        result: {
            targetYearId: number | null;
            targetYearLabel: string | null;
            processed: number;
        } | undefined;
    }>;
}
