import type { CurrentUser as CurrentUserType } from '../common/types/current-user';
export declare class AuthController {
    me(user: CurrentUserType | undefined): {
        user: CurrentUserType | undefined;
    };
}
