import { UsersService, type UserListItem } from './users.service';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PageResult } from '../../common/utils/pagination';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    list(query: UsersListQueryDto): Promise<PageResult<UserListItem>>;
    get(id: string): Promise<{
        user: UserListItem;
    }>;
    create(payload: CreateUserDto): Promise<{
        user: UserListItem;
    }>;
    update(id: string, payload: UpdateUserDto): Promise<{
        user: UserListItem;
    }>;
    remove(id: string): Promise<{
        status: string;
    }>;
}
