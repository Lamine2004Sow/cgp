import { Controller, Get, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { DashboardStatsQueryDto } from './dto/dashboard-stats-query.dto';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Roles(...Object.values(ROLE_IDS))
  async stats(@Query() query: DashboardStatsQueryDto) {
    const stats = await this.dashboardService.getStats(query.yearId);
    return { stats };
  }
}
