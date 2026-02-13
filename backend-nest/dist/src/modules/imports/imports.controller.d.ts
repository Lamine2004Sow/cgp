import { ImportsService } from './imports.service';
import { ImportResponsablesDto } from './dto/import-responsables.dto';
export declare class ImportsController {
    private readonly importsService;
    constructor(importsService: ImportsService);
    importResponsables(payload: ImportResponsablesDto): Promise<{
        result: {
            imported_rows: number;
            created_users: number;
            created_affectations: number;
        };
    }>;
}
