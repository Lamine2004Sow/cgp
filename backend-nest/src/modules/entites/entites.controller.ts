import { Body, Controller, Get, NotFoundException, Param, Patch, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { EntitesService } from './entites.service';
import { EntitesListQueryDto } from './dto/entites-list-query.dto';
import { UpdateEntiteDto } from './dto/update-entite.dto';

@Controller('entites')
export class EntitesController {
  constructor(private readonly entitesService: EntitesService) {}

  @Get()
  @Roles(...Object.values(ROLE_IDS))
  async list(@Query() query: EntitesListQueryDto) {
    const items = await this.entitesService.list(query.yearId);
    return { items };
  }

  @Get(':id')
  @Roles(...Object.values(ROLE_IDS))
  async getOne(@Param('id') id: string) {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) throw new NotFoundException('Identifiant invalide');
    const item = await this.entitesService.findOne(idNum);
    if (!item) throw new NotFoundException('Entité introuvable');
    return { item };
  }

  @Patch(':id')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateEntiteDto,
  ) {
    const idNum = Number(id);
    if (Number.isNaN(idNum)) throw new NotFoundException('Identifiant invalide');
    const item = await this.entitesService.update(idNum, payload);
    return { item };
  }
}
