import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { RoleResponseDto } from './dto/role-response.dto';
import type { role } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<RoleResponseDto[]> {
    const roles = await this.prisma.role.findMany({
      orderBy: { niveau_hierarchique: 'asc' },
    });

    return roles.map((item) => this.toRoleResponse(item));
  }

  private toRoleResponse(item: role): RoleResponseDto {
    return {
      id: item.id_role,
      libelle: item.libelle,
      description: item.description,
      niveauHierarchique: item.niveau_hierarchique,
      isGlobal: item.is_global,
      idComposante: item.id_composante ? String(item.id_composante) : null,
    };
  }
}
