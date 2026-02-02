import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUser as CurrentUserType } from '../common/types/current-user';

@Controller('auth')
export class AuthController {
  @Get('me')
  me(@CurrentUser() user: CurrentUserType | undefined) {
    return { user };
  }
}
