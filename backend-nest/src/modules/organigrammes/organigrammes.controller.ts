import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrganigrammesService, type ApiOrgNode } from './organigrammes.service';
import { OrganigrammesListQueryDto } from './dto/organigrammes-list-query.dto';
import { OrganigrammeGenerateDto } from './dto/organigramme-generate.dto';

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
  async list(
    @Query() query: OrganigrammesListQueryDto,
  ): Promise<{ items: OrganigrammeDto[] }> {
    const items = await this.organigrammesService.list(query.yearId);
    return { items };
  }

  @Get('latest')
  async latest(
    @Query() query: OrganigrammesListQueryDto,
  ): Promise<{ organigramme: OrganigrammeDto | null; arbre: ApiOrgNode | null }> {
    if (!query.yearId) {
      return { organigramme: null, arbre: null };
    }
    return this.organigrammesService.latest(query.yearId);
  }

  @Post('generate')
  async generate(
    @Req() request: Request,
    @Body() payload: OrganigrammeGenerateDto,
  ): Promise<{ organigramme: OrganigrammeDto; arbre: ApiOrgNode | null }> {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    return this.organigrammesService.generate(
      payload.id_annee,
      payload.id_entite_racine,
      userId,
    );
  }

  @Get(':id/tree')
  async tree(
    @Param('id') id: string,
  ): Promise<{ organigramme: OrganigrammeDto; arbre: ApiOrgNode | null }> {
    return this.organigrammesService.getTreeById(id);
  }

  @Patch(':id/freeze')
  async freeze(
    @Param('id') id: string,
  ): Promise<{ organigramme: OrganigrammeDto }> {
    return this.organigrammesService.freeze(id);
  }
}
