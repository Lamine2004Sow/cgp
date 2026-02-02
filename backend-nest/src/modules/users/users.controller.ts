import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { UsersService, type UserListItem } from './users.service';
import { UsersListQueryDto } from './dto/users-list-query.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import type { PageResult } from '../../common/utils/pagination';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async list(@Query() query: UsersListQueryDto): Promise<PageResult<UserListItem>> {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<{ user: UserListItem }> {
    const user = await this.usersService.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { user };
  }

  @Post()
  async create(@Body() payload: CreateUserDto): Promise<{ user: UserListItem }> {
    const user = await this.usersService.create(payload);
    return { user };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() payload: UpdateUserDto,
  ): Promise<{ user: UserListItem }> {
    const user = await this.usersService.update(id, payload);
    return { user };
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.usersService.remove(id);
    return { status: 'deleted' };
  }
}
