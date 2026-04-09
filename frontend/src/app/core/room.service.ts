import { inject, Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Room {
  code: string;
  hostUserId: string;
  guestUserId?: string;
  status: 'waiting' | 'playing' | 'finished';
  options: {
    mode: 'battle' | 'quiz';
    difficulty: 'easy' | 'normal' | 'expert';
    durationInMinutes: 1 | 2 | 3 | 5 | 10;
    warriorMode: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class RoomService {
  private readonly api = inject(ApiService);

  createRoom() {
    return this.api.post<Room>('/rooms', {});
  }

  joinRoom(code: string) {
    return this.api.post<Room>(`/rooms/${code}/join`, {});
  }

  getRoom(code: string) {
    return this.api.get<Room>(`/rooms/${code}`);
  }

  updateOptions(code: string, options: Partial<Room['options']>) {
    return this.api.patch<Room>(`/rooms/${code}/options`, options);
  }
}
