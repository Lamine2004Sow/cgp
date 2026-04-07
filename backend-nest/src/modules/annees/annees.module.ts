import { Module } from '@nestjs/common';
import { ExportsModule } from '../exports/exports.module';
import { AnneesController } from './annees.controller';
import { AnneesService } from './annees.service';

@Module({
  imports: [ExportsModule],
  controllers: [AnneesController],
  providers: [AnneesService],
})
export class AnneesModule {}
