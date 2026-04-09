import { Injectable } from '@nestjs/common';
import { Difficulty, QuestionEntity } from '../common/types';

@Injectable()
export class QuestionsService {
  private readonly questions: QuestionEntity[] = [
    {
      id: 'q1',
      category: 'Culture générale',
      difficulty: 'easy',
      prompt: 'Quelle est la capitale de la France ?',
      choices: ['Paris', 'Lyon', 'Marseille', 'Toulouse'],
      answer: 'Paris',
    },
    {
      id: 'q2',
      category: 'Technologie',
      difficulty: 'normal',
      prompt: 'Quel protocole est utilisé pour les API REST sécurisées ?',
      choices: ['HTTP(S)', 'FTP', 'SMTP', 'SSH'],
      answer: 'HTTP(S)',
    },
    {
      id: 'q3',
      category: 'Mathématiques',
      difficulty: 'expert',
      prompt: 'Combien vaut la dérivée de x² ?',
      choices: ['x', '2x', 'x²', '2'],
      answer: '2x',
    },
  ];

  getByDifficulty(difficulty: Difficulty) {
    return this.questions
      .filter((question) => question.difficulty === difficulty)
      .map(({ answer: _ignored, ...publicQuestion }) => publicQuestion);
  }

  findAnswer(questionId: string): string | undefined {
    return this.questions.find((question) => question.id === questionId)?.answer;
  }
}
