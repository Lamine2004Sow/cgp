import { PrismaService } from '../../common/prisma/prisma.service';
export declare class EntitesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    list(yearId?: number): Promise<{
        id_entite: number;
        id_annee: number;
        id_entite_parent: number | null;
        type_entite: import("@prisma/client").$Enums.entite_type;
        nom: string;
        tel_service: string | null;
        bureau_service: string | null;
    }[]>;
}
