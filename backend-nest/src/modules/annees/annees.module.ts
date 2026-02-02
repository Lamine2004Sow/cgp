import { Module } from '@nestjs/common';
import { AnneesController } from './annees.controller';
import { AnneesService } from './annees.service';

@Module({
  controllers: [AnneesController],
  providers: [AnneesService],
})
export class AnneesModule {}
