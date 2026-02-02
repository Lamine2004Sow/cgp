import { PrismaService } from '../../common/prisma/prisma.service';
import { type PageResult } from '../../common/utils/pagination';
import type { UsersListQueryDto } from './dto/users-list-query.dto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
export interface UserRoleRow {
    role: string;
    entite: string;
    id_entite: number;
    id_annee: number;
    niveau_hierarchique: number;
}
export interface UserListItem {
    id_user: number;
    login: string;
    nom: string;
    prenom: string;
    email_institutionnel: string | null;
    telephone: string | null;
    bureau: string | null;
    roles: UserRoleRow[];
}
export declare class UsersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(query: UsersListQueryDto): Promise<PageResult<UserListItem>>;
    findOne(id: string): Promise<UserListItem | null>;
    create(payload: CreateUserDto): Promise<UserListItem>;
    update(id: string, payload: UpdateUserDto): Promise<UserListItem>;
    remove(id: string): Promise<void>;
    private toUserListItem;
    private buildQuery;
    private parseSort;
}
