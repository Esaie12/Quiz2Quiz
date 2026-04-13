import { Body, Controller, Get, Headers, Param, Patch, Post } from '@nestjs/common';
import { RoomsService } from './rooms.service';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  create(@Headers('authorization') authHeader: string) {
    const userId = (authHeader ?? '').replace('Bearer ', '').trim();
    return this.roomsService.createRoom(userId);
  }

  @Post(':code/join')
  join(@Param('code') code: string, @Headers('authorization') authHeader: string) {
    const userId = (authHeader ?? '').replace('Bearer ', '').trim();
    return this.roomsService.joinRoom(code.toUpperCase(), userId);
  }

  @Get(':code')
  findOne(@Param('code') code: string) {
    return this.roomsService.findOne(code.toUpperCase());
  }

  @Patch(':code/options')
  updateOptions(@Param('code') code: string, @Body() body: Record<string, unknown>) {
    return this.roomsService.updateOptions(code.toUpperCase(), body as never);
  }
}
