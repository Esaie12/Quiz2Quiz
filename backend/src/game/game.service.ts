import { Injectable } from '@nestjs/common';
import { QuestionsService } from '../questions/questions.service';
import { RoomsService } from '../rooms/rooms.service';

@Injectable()
export class GameService {
  private readonly scores = new Map<string, { host: number; guest: number }>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly questionsService: QuestionsService,
  ) {}

  start(code: string) {
    const room = this.roomsService.findOne(code);
    room.status = 'playing';

    const questions = this.questionsService.getByDifficulty(room.options.difficulty);
    this.scores.set(code, { host: 0, guest: 0 });

    return {
      roomCode: code,
      options: room.options,
      questions,
      startedAt: new Date().toISOString(),
    };
  }

  answer(code: string, payload: { player: 'host' | 'guest'; questionId: string; answer: string; responseMs: number }) {
    const expectedAnswer = this.questionsService.findAnswer(payload.questionId);
    const scoreBySpeed = payload.responseMs <= 2000 ? 10 : payload.responseMs <= 5000 ? 5 : 0;
    const baseScore = expectedAnswer === payload.answer ? 2 : -1;

    const roomScore = this.scores.get(code) ?? { host: 0, guest: 0 };
    roomScore[payload.player] += baseScore + scoreBySpeed;
    this.scores.set(code, roomScore);

    return {
      roomCode: code,
      scores: roomScore,
      pointsAwarded: baseScore + scoreBySpeed,
      correct: expectedAnswer === payload.answer,
    };
  }

  getState(code: string) {
    const room = this.roomsService.findOne(code);
    return {
      room,
      scores: this.scores.get(code) ?? { host: 0, guest: 0 },
    };
  }
}
