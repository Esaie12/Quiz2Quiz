import { Controller, Get, Headers } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Headers('authorization') authHeader?: string) {
    const userId = (authHeader ?? '').replace('Bearer ', '').trim();
    const user = this.usersService.findById(userId);
    return this.usersService.toPublic(user);
  }
}
