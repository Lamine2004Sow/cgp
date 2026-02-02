import { Controller, Get, Query } from '@nestjs/common';
import { EntitesService } from './entites.service';
import { EntitesListQueryDto } from './dto/entites-list-query.dto';

@Controller('entites')
export class EntitesController {
  constructor(private readonly entitesService: EntitesService) {}

  @Get()
  async list(@Query() query: EntitesListQueryDto) {
    const items = await this.entitesService.list(query.yearId);
    return { items };
  }
}
