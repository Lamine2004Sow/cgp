import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { DelegationsService } from './delegations.service';
import { CreateDelegationDto } from './dto/create-delegation.dto';

@Controller('delegations')
export class DelegationsController {
  constructor(private readonly delegationsService: DelegationsService) {}

  @Get()
  async list() {
    const items = await this.delegationsService.list();
    return { items };
  }

  @Post()
  async create(@Req() request: Request, @Body() payload: CreateDelegationDto) {
    const userId = request.user?.userId;
    if (!userId) {
      throw new UnauthorizedException();
    }
    const delegation = await this.delegationsService.create(userId, payload);
    return { delegation };
  }

  @Patch(':id/revoke')
  async revoke(@Param('id') id: string) {
    const delegation = await this.delegationsService.revoke(id);
    return { delegation };
  }
}
