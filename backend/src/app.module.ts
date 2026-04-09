import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { DocsModule } from './docs/docs.module';
import { GameModule } from './game/game.module';
import { QuestionsModule } from './questions/questions.module';
import { RoomsModule } from './rooms/rooms.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [DatabaseModule, AuthModule, UsersModule, RoomsModule, QuestionsModule, GameModule, DocsModule],
  controllers: [AppController],
})
export class AppModule {}
