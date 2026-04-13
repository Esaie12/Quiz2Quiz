import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { GameService } from './game.service';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post(':code/start')
  start(@Param('code') code: string) {
    return this.gameService.start(code.toUpperCase());
  }

  @Post(':code/answer')
  answer(
    @Param('code') code: string,
    @Body() body: { player: 'host' | 'guest'; questionId: string; answer: string; responseMs: number },
  ) {
    return this.gameService.answer(code.toUpperCase(), body);
  }

  @Get(':code/state')
  state(@Param('code') code: string) {
    return this.gameService.getState(code.toUpperCase());
  }
}
