import { Module } from '@nestjs/common';
import { OrganigrammesController } from './organigrammes.controller';
import { OrganigrammesService } from './organigrammes.service';

@Module({
  controllers: [OrganigrammesController],
  providers: [OrganigrammesService],
})
export class OrganigrammesModule {}
