import { Module } from '@nestjs/common';
import { QuestionsModule } from '../questions/questions.module';
import { RoomsModule } from '../rooms/rooms.module';
import { GameController } from './game.controller';
import { GameService } from './game.service';

@Module({
  imports: [RoomsModule, QuestionsModule],
  controllers: [GameController],
  providers: [GameService],
})
export class GameModule {}
