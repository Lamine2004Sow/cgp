import { PrismaService } from '../../common/prisma/prisma.service';
import type { RoleResponseDto } from './dto/role-response.dto';
export declare class RolesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<RoleResponseDto[]>;
    private toRoleResponse;
}
