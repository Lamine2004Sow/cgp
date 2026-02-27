import { PrismaService } from '../../common/prisma/prisma.service';
import type { CurrentUser } from '../../common/types/current-user';
export declare class NotificationsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(user: CurrentUser, page?: number, pageSize?: number): Promise<{
        items: {
            id_notif: number;
            message: string;
            lu: boolean;
            date_envoi: string;
            id_demande: number | null;
            id_signalement: number | null;
            id_demande_role: number | null;
        }[];
        page: number;
        pageSize: number;
        total: number;
    }>;
    markAsRead(user: CurrentUser, id: string): Promise<{
        id_notif: number;
        message: string;
        lu: boolean;
        date_envoi: string;
    }>;
}
