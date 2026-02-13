import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { OrganigrammesService, type ApiOrgNode } from './organigrammes.service';
import { OrganigrammesListQueryDto } from './dto/organigrammes-list-query.dto';
import { OrganigrammeGenerateDto } from './dto/organigramme-generate.dto';
import { OrganigrammeExportQueryDto } from './dto/organigramme-export-query.dto';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';

type OrganigrammeDto = {
  id_organigramme: number;
  id_annee: number;
  id_entite_racine: number;
  generated_by: number;
  generated_at: string;
  est_fige: boolean;
  export_path?: string | null;
  export_format?: string;
  visibility_scope?: string | null;
};

@Controller('organigrammes')
export class OrganigrammesController {
  constructor(private readonly organigrammesService: OrganigrammesService) {}

  @Get()
  @Roles(...Object.values(ROLE_IDS))
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query() query: OrganigrammesListQueryDto,
  ): Promise<{ items: OrganigrammeDto[] }> {
    const items = await this.organigrammesService.list(user, query.yearId);
    return { items };
  }

  @Get('latest')
  @Roles(...Object.values(ROLE_IDS))
  async latest(
    @CurrentUser() user: CurrentUserType,
    @Query() query: OrganigrammesListQueryDto,
  ): Promise<{ organigramme: OrganigrammeDto | null; arbre: ApiOrgNode | null }> {
    if (!query.yearId) {
      return { organigramme: null, arbre: null };
    }
    return this.organigrammesService.latest(user, query.yearId);
  }

  @Post('generate')
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
  async generate(
    @CurrentUser() user: CurrentUserType,
    @Body() payload: OrganigrammeGenerateDto,
  ): Promise<{ organigramme: OrganigrammeDto; arbre: ApiOrgNode | null }> {
    return this.organigrammesService.generate(user, payload.id_annee, payload.id_entite_racine);
  }

  @Get(':id/tree')
  @Roles(...Object.values(ROLE_IDS))
  async tree(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ): Promise<{ organigramme: OrganigrammeDto; arbre: ApiOrgNode | null }> {
    return this.organigrammesService.getTreeById(user, id);
  }

  @Patch(':id/freeze')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async freeze(
    @Param('id') id: string,
  ): Promise<{ organigramme: OrganigrammeDto }> {
    return this.organigrammesService.freeze(id);
  }

  @Get(':id/export')
  @Roles(...Object.values(ROLE_IDS))
  async export(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Query() query: OrganigrammeExportQueryDto,
  ) {
    return this.organigrammesService.export(user, id, query.format || 'PDF');
  }
}
