import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { UsersService, type UserListItem } from './users.service';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PageResult } from '../../common/utils/pagination';

@Controller('users')
@Roles(...Object.values(ROLE_IDS))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query() query: UsersListQueryDto,
  ): Promise<PageResult<UserListItem>> {
    return this.usersService.findAll(query, user);
  }

  @Get(':id')
  async get(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id') id: string,
  ): Promise<{ user: UserListItem }> {
    const user = await this.usersService.findOne(id, currentUser);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { user };
  }

  @Post()
  @Roles(
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async create(@Body() payload: CreateUserDto): Promise<{ user: UserListItem }> {
    const user = await this.usersService.create(payload);
    return { user };
  }

  @Patch(':id')
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
    ROLE_IDS.DIRECTEUR_DEPARTEMENT,
    ROLE_IDS.DIRECTEUR_MENTION,
    ROLE_IDS.DIRECTEUR_SPECIALITE,
    ROLE_IDS.RESPONSABLE_FORMATION,
    ROLE_IDS.RESPONSABLE_ANNEE,
    ROLE_IDS.UTILISATEUR_SIMPLE,
    ROLE_IDS.LECTURE_SEULE,
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.ADMINISTRATEUR,
  )
  async update(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
  ): Promise<{ user: UserListItem }> {
    const isSelf = currentUser.userId === id;

    if (isSelf) {
      if (
        payload.nom !== undefined ||
        payload.prenom !== undefined ||
        payload.email_institutionnel !== undefined
      ) {
        throw new ForbiddenException(
          'You can only update telephone and bureau on your own profile',
        );
      }
    } else {
      const managerRoles = new Set<string>([
        ROLE_IDS.SERVICES_CENTRAUX,
        ROLE_IDS.DIRECTEUR_COMPOSANTE,
        ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
        ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
      ]);
      const canManageOthers = currentUser.affectations.some((affectation) => {
        return managerRoles.has(affectation.roleId);
      });
      if (!canManageOthers) {
        throw new ForbiddenException('Insufficient role to update another user');
      }

      const target = await this.usersService.findOne(id, currentUser);
      if (!target) {
        throw new NotFoundException('User not found');
      }
    }

    const user = await this.usersService.update(id, payload);
    return { user };
  }

  @Delete(':id')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX, ROLE_IDS.DIRECTEUR_COMPOSANTE)
  async remove(
    @CurrentUser() currentUser: CurrentUserType,
    @Param('id') id: string,
  ) {
    const target = await this.usersService.findOne(id, currentUser);
    if (!target) {
      throw new NotFoundException('User not found');
    }
    await this.usersService.remove(id);
    return { status: 'deleted' };
  }
}
