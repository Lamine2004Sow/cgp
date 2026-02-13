import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { UsersService, type UserListItem } from './users.service';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PageResult } from '../../common/utils/pagination';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(user: CurrentUserType, query: UsersListQueryDto): Promise<PageResult<UserListItem>>;
    get(currentUser: CurrentUserType, id: string): Promise<{
        user: UserListItem;
    }>;
    create(payload: CreateUserDto): Promise<{
        user: UserListItem;
    }>;
    update(currentUser: CurrentUserType, id: string, payload: UpdateUserDto): Promise<{
        user: UserListItem;
    }>;
    remove(currentUser: CurrentUserType, id: string): Promise<{
        status: string;
    }>;
}
