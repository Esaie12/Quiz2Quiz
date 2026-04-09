import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomEntity, RoomOptions } from '../common/types';

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, RoomEntity>();

  createRoom(hostUserId: string) {
    const room: RoomEntity = {
      code: this.generateCode(),
      hostUserId,
      status: 'waiting',
      createdAt: new Date().toISOString(),
      options: {
        mode: 'battle',
        difficulty: 'normal',
        durationInMinutes: 3,
        warriorMode: false,
      },
    };

    this.rooms.set(room.code, room);
    return room;
  }

  joinRoom(code: string, guestUserId: string) {
    const room = this.findOne(code);
    room.guestUserId = guestUserId;
    this.rooms.set(code, room);
    return room;
  }

  updateOptions(code: string, options: Partial<RoomOptions>) {
    const room = this.findOne(code);
    room.options = { ...room.options, ...options };
    this.rooms.set(code, room);
    return room;
  }

  findOne(code: string) {
    const room = this.rooms.get(code.toUpperCase());
    if (!room) {
      throw new NotFoundException('Salon introuvable.');
    }
    return room;
  }

  private generateCode() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }
}
