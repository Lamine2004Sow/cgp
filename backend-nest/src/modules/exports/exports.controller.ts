import { Controller, Get, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExportsService } from './exports.service';
import { ExportsQueryDto } from './dto/exports-query.dto';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('responsables')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async exportResponsables(@Query() query: ExportsQueryDto) {
    const items = await this.exportsService.exportResponsables({
      yearId: query.yearId,
      entiteId: query.entiteId,
      roleId: query.roleId,
    });
    return { items };
  }
}
