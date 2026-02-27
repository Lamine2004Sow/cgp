import { DashboardStatsQueryDto } from './dto/dashboard-stats-query.dto';
import { DashboardService } from './dashboard.service';
export declare class DashboardController {
    private readonly dashboardService;
    constructor(dashboardService: DashboardService);
    stats(query: DashboardStatsQueryDto): Promise<{
        stats: {
            yearId: number;
            yearLabel: string;
            formations: number;
            responsables: number;
            departements: number;
            composantes: number;
        };
    }>;
}
