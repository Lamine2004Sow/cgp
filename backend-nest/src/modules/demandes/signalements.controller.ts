import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { SignalementsService } from './signalements.service';
import { SignalementsListQueryDto } from './dto/signalements-list-query.dto';
import { CreateSignalementDto } from './dto/create-signalement.dto';
import { UpdateSignalementDto } from './dto/update-signalement.dto';

@Controller('signalements')
export class SignalementsController {
  constructor(private readonly signalementsService: SignalementsService) {}

  @Get()
  async list(@Query() query: SignalementsListQueryDto) {
    const items = await this.signalementsService.list(query.statut);
    return { items };
  }

  @Post()
  async create(@Req() request: Request, @Body() payload: CreateSignalementDto) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const signalement = await this.signalementsService.create(userId, payload);
    return { signalement };
  }

  @Patch(':id')
  async update(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() payload: UpdateSignalementDto,
  ) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const signalement = await this.signalementsService.update(id, userId, payload);
    return { signalement };
  }
}
