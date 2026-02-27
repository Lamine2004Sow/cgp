import { Controller, Get, HttpCode, HttpStatus, Param, Patch, Query } from '@nestjs/common';
import { ROLE_IDS } from '../../auth/roles.constants';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../../common/types/current-user';
import { NotificationsService } from './notifications.service';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

class NotificationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles(...Object.values(ROLE_IDS))
  async findAll(
    @CurrentUser() user: CurrentUserType,
    @Query() query: NotificationsQueryDto,
  ) {
    return this.notificationsService.findAll(user, query.page, query.pageSize);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @Roles(...Object.values(ROLE_IDS))
  async markAsRead(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    const notification = await this.notificationsService.markAsRead(user, id);
    return { notification };
  }
}
