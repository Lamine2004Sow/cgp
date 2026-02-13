import { Controller, Get, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { EntitesService } from './entites.service';
import { EntitesListQueryDto } from './dto/entites-list-query.dto';

@Controller('entites')
export class EntitesController {
  constructor(private readonly entitesService: EntitesService) {}

  @Get()
  @Roles(...Object.values(ROLE_IDS))
  async list(@Query() query: EntitesListQueryDto) {
    const items = await this.entitesService.list(query.yearId);
    return { items };
  }
}
