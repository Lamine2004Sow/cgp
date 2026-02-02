import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AnneesService } from './annees.service';
import { YearsListQueryDto } from './dto/years-list-query.dto';
import { CloneYearDto } from './dto/clone-year.dto';

@Controller('years')
export class AnneesController {
  constructor(private readonly anneesService: AnneesService) {}

  @Get()
  async list(@Query() query: YearsListQueryDto) {
    const items = await this.anneesService.list(query.statut);
    return { items };
  }

  @Post(':id/clone')
  async clone(@Param('id') id: string, @Body() payload: CloneYearDto) {
    const year = await this.anneesService.cloneYear(id, payload);
    return { year };
  }
}
