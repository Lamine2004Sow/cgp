import { Body, Controller, Post } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImportsService } from './imports.service';
import { ImportResponsablesDto } from './dto/import-responsables.dto';
import { ImportConfirmDto } from './dto/import-confirm.dto';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('responsables/preview')
  @Roles(
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async previewResponsables(@Body() payload: ImportResponsablesDto) {
    return this.importsService.previewResponsables(payload);
  }

  @Post('responsables/confirm')
  @Roles(
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async confirmResponsables(@Body() payload: ImportConfirmDto) {
    const result = await this.importsService.importResponsables(
      { rows: payload.rows },
      payload.excludeIndices,
    );
    return { result };
  }

  @Post('responsables')
  @Roles(
    ROLE_IDS.SERVICES_CENTRAUX,
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async importResponsables(@Body() payload: ImportResponsablesDto) {
    const result = await this.importsService.importResponsables(payload);
    return { result };
  }
}
