import { Body, Controller, Post } from '@nestjs/common';
import { AffectationsService } from './affectations.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';

@Controller('affectations')
export class AffectationsController {
  constructor(private readonly affectationsService: AffectationsService) {}

  @Post()
  async create(@Body() payload: CreateAffectationDto) {
    const affectation = await this.affectationsService.create(payload);
    return { affectation };
  }
}
