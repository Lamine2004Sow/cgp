import { Body, Controller, Post } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { AffectationsService } from './affectations.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';

@Controller('affectations')
export class AffectationsController {
  constructor(private readonly affectationsService: AffectationsService) {}

  @Post()
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async create(@Body() payload: CreateAffectationDto) {
    const affectation = await this.affectationsService.create(payload);
    return { affectation };
  }
}
