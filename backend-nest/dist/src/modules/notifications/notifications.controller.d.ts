import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { NotificationsService } from './notifications.service';
declare class NotificationsQueryDto {
    page?: number;
    pageSize?: number;
}
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    findAll(user: CurrentUserType, query: NotificationsQueryDto): Promise<{
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
    markAsRead(user: CurrentUserType, id: string): Promise<{
        notification: {
            id_notif: number;
            message: string;
            lu: boolean;
            date_envoi: string;
        };
    }>;
}
export {};
