import type { CurrentUser } from '../common/types/current-user';
export declare class AuthorizationService {
    canRead(user: CurrentUser): boolean;
    canWrite(user: CurrentUser): boolean;
    canExport(user: CurrentUser): boolean;
    canImport(user: CurrentUser): boolean;
    canDelegate(user: CurrentUser): boolean;
    canFreezeYear(user: CurrentUser): boolean;
    private hasAnyRole;
    private allWriteRoles;
}
