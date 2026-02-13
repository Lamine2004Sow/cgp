import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { AnneesService } from './annees.service';
import { YearsListQueryDto } from './dto/years-list-query.dto';
import { CloneYearDto } from './dto/clone-year.dto';
import { UpdateYearStatusDto } from './dto/update-year-status.dto';

@Controller('years')
export class AnneesController {
  constructor(private readonly anneesService: AnneesService) {}

  @Get()
  @Roles(...Object.values(ROLE_IDS))
  async list(@Query() query: YearsListQueryDto) {
    const items = await this.anneesService.list(query.statut);
    return { items };
  }

  @Post(':id/clone')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async clone(@Param('id') id: string, @Body() payload: CloneYearDto) {
    const year = await this.anneesService.cloneYear(id, payload);
    return { year };
  }

  @Patch(':id/status')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async updateStatus(
    @Param('id') id: string,
    @Body() payload: UpdateYearStatusDto,
  ) {
    const year = await this.anneesService.updateStatus(id, payload.statut);
    return { year };
  }
}
