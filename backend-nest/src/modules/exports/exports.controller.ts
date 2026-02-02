import { Controller, Get, Query } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportsQueryDto } from './dto/exports-query.dto';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Get('responsables')
  async exportResponsables(@Query() query: ExportsQueryDto) {
    const items = await this.exportsService.exportResponsables(query.yearId);
    return { items };
  }
}
