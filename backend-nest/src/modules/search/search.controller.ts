import { Controller, Get, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('responsables')
  @Roles(...Object.values(ROLE_IDS))
  async responsables(@Query() query: SearchQueryDto) {
    const items = await this.searchService.responsables(query);
    return { items };
  }

  @Get('formations')
  @Roles(...Object.values(ROLE_IDS))
  async formations(@Query() query: SearchQueryDto) {
    const items = await this.searchService.formations(query);
    return { items };
  }

  @Get('structures')
  @Roles(...Object.values(ROLE_IDS))
  async structures(@Query() query: SearchQueryDto) {
    const items = await this.searchService.structures(query);
    return { items };
  }

  @Get('secretariats')
  @Roles(...Object.values(ROLE_IDS))
  async secretariats(@Query() query: SearchQueryDto) {
    const items = await this.searchService.secretariats(query);
    return { items };
  }
}
