import { Controller, Get, Query } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Get()
  list(@Query('difficulty') difficulty: 'easy' | 'normal' | 'expert' = 'normal') {
    return this.questionsService.getByDifficulty(difficulty);
  }
}
