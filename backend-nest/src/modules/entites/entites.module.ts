import { Module } from '@nestjs/common';
import { EntitesController } from './entites.controller';
import { EntitesService } from './entites.service';

@Module({
  controllers: [EntitesController],
  providers: [EntitesService],
})
export class EntitesModule {}
