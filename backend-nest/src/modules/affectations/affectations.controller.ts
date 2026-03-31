import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { AffectationsService, UpsertContactDto } from './affectations.service';
import { CreateAffectationDto } from './dto/create-affectation.dto';
import { UpdateAffectationDto } from './dto/update-affectation.dto';

@Controller('affectations')
export class AffectationsController {
  constructor(private readonly affectationsService: AffectationsService) {}

  @Post()
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
    ROLE_IDS.SERVICES_CENTRAUX,
  )
  async create(@Body() payload: CreateAffectationDto) {
    const affectation = await this.affectationsService.create(payload);
    return { affectation };
  }

  @Get(':id')
  @Roles(...Object.values(ROLE_IDS))
  async findOne(@Param('id') id: string) {
    const affectation = await this.affectationsService.findOne(id);
    return { affectation };
  }

  @Patch(':id')
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
    ROLE_IDS.SERVICES_CENTRAUX,
  )
  async update(@Param('id') id: string, @Body() payload: UpdateAffectationDto) {
    const affectation = await this.affectationsService.update(id, payload);
    return { affectation };
  }

  @Patch(':id/contact')
  @Roles(...Object.values(ROLE_IDS))
  async upsertContact(@Param('id') id: string, @Body() payload: UpsertContactDto) {
    const contact = await this.affectationsService.upsertContact(id, payload);
    return { contact };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
    ROLE_IDS.SERVICES_CENTRAUX,
  )
  async remove(@Param('id') id: string) {
    await this.affectationsService.remove(id);
  }
}
