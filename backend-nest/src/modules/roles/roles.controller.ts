import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { RolesService } from './roles.service';
import { RoleRequestsQueryDto } from './dto/role-requests-query.dto';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get('requests')
  @Roles(
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
    ROLE_IDS.DIRECTEUR_DEPARTEMENT,
    ROLE_IDS.DIRECTEUR_MENTION,
    ROLE_IDS.DIRECTEUR_SPECIALITE,
    ROLE_IDS.RESPONSABLE_FORMATION,
  )
  async listRequests(
    @CurrentUser() user: CurrentUserType,
    @Query() query: RoleRequestsQueryDto,
  ) {
    const items = await this.rolesService.listRequests(user, query.statut);
    return { items };
  }

  @Post('requests')
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
    ROLE_IDS.DIRECTEUR_DEPARTEMENT,
    ROLE_IDS.DIRECTEUR_MENTION,
    ROLE_IDS.DIRECTEUR_SPECIALITE,
    ROLE_IDS.RESPONSABLE_FORMATION,
  )
  async createRequest(
    @CurrentUser() user: CurrentUserType,
    @Body() payload: CreateRoleRequestDto,
  ) {
    const request = await this.rolesService.createRequest(user, payload);
    return { request };
  }

  @Patch('requests/:id')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async reviewRequest(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() payload: UpdateRoleRequestDto,
  ) {
    const request = await this.rolesService.reviewRequest(user, id, payload);
    return { request };
  }

  @Get()
  @Roles(...Object.values(ROLE_IDS))
  async list() {
    const items = await this.rolesService.findAll();
    return { items };
  }
}
