import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { SignalementsService } from './signalements.service';
import { SignalementsListQueryDto } from './dto/signalements-list-query.dto';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';

@Controller('signalements')
export class SignalementsController {
  constructor(private readonly signalementsService: SignalementsService) {}

  @Get()
  async list(
    @CurrentUser() user: CurrentUserType,
    @Query() query: SignalementsListQueryDto,
  ) {
    const items = await this.signalementsService.list(user, query.statut);
    return { items };
  }

  @Post()
  async create(@CurrentUser() user: CurrentUserType, @Body() payload: CreateSignalementDto) {
    const signalement = await this.signalementsService.create(user.userId, payload);
    return { signalement };
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() payload: UpdateSignalementDto,
  ) {
    const signalement = await this.signalementsService.update(id, user, payload);
    return { signalement };
  }

  @Patch(':id/escalade')
  async escalade(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    const signalement = await this.signalementsService.update(id, user, { escalade_sc: true });
    return { signalement };
  }
}
