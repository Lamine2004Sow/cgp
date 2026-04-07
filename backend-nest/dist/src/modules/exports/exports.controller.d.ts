import { ExportsService } from './exports.service';
import { ExportsQueryDto } from './dto/exports-query.dto';
export declare class ExportsController {
    private readonly exportsService;
    constructor(exportsService: ExportsService);
    exportResponsables(query: ExportsQueryDto): Promise<{
        items: {
            nom: string;
            prenom: string;
            email_institutionnel: string | null;
            role: string;
            entite: string;
            id_annee: number;
        }[];
    }>;
    exportWorkbook(query: ExportsQueryDto): Promise<{
        fileName: string;
        mimeType: string;
        contentBase64: string;
    }>;
}
