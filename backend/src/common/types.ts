export type GameMode = 'battle' | 'quiz';
export type Difficulty = 'easy' | 'normal' | 'expert';

export interface UserEntity {
  id: string;
  email: string;
  pseudo: string;
  passwordHash: string;
  refreshToken?: string;
}

export interface RoomOptions {
  mode: GameMode;
  difficulty: Difficulty;
  durationInMinutes: 1 | 2 | 3 | 5 | 10;
  warriorMode: boolean;
}

export interface RoomEntity {
  code: string;
  hostUserId: string;
  guestUserId?: string;
  status: 'waiting' | 'playing' | 'finished';
  options: RoomOptions;
  createdAt: string;
}

export interface QuestionEntity {
  id: string;
  category: string;
  difficulty: Difficulty;
  prompt: string;
  choices: string[];
  answer: string;
}
