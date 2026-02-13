import { Body, Controller, Post } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { ImportsService } from './imports.service';
import { ImportResponsablesDto } from './dto/import-responsables.dto';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('responsables')
  @Roles(
    ROLE_IDS.DIRECTEUR_COMPOSANTE,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF,
    ROLE_IDS.DIRECTEUR_ADMINISTRATIF_ADJOINT,
  )
  async importResponsables(@Body() payload: ImportResponsablesDto) {
    const result = await this.importsService.importResponsables(payload);
    return { result };
  }
}
