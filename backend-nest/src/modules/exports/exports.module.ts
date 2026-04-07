import { Module } from '@nestjs/common';
import { ExportsController } from './exports.controller';
import { ExportsService } from './exports.service';
import { StandardWorkbookService } from './standard-workbook.service';

@Module({
  controllers: [ExportsController],
  providers: [ExportsService, StandardWorkbookService],
  exports: [StandardWorkbookService],
})
export class ExportsModule {}
