import { Controller, Get, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditListQueryDto } from './dto/audit-list-query.dto';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async list(@Query() query: AuditListQueryDto) {
    return this.auditService.list(query);
  }

  @Get('export')
  @Roles(ROLE_IDS.SERVICES_CENTRAUX)
  async export(@Query() query: AuditListQueryDto) {
    const csv = await this.auditService.exportCsv(query);
    return { csv };
  }
}
