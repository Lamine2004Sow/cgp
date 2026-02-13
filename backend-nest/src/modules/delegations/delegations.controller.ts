import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { DelegationsService } from './delegations.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';
import { DelegationsListQueryDto } from './dto/delegations-list-query.dto';

@Controller('delegations')
export class DelegationsController {
  constructor(private readonly delegationsService: DelegationsService) {}

  @Get()
  @Roles(
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query() query: DelegationsListQueryDto,
  ) {
    const items = await this.delegationsService.list(user, query);
    return { items };
  }

  @Post()
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() payload: CreateDelegationDto,
  ) {
    const delegation = await this.delegationsService.create(user.userId, payload);
    return { delegation };
  }

  @Get('export')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async export(
    @CurrentUser() user: CurrentUserType,
    @Query() query: DelegationsListQueryDto,
  ) {
    const csv = await this.delegationsService.exportCsv(user, query);
    return { csv };
  }

  @Patch(':id/revoke')
  @Roles(
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async revoke(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const delegation = await this.delegationsService.revoke(user, id);
    return { delegation };
  }
}
