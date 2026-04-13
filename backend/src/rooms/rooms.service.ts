import { Injectable, NotFoundException } from '@nestjs/common';
import { RoomEntity, RoomOptions } from '../common/types';
import { PostgresService } from '../database/postgres.service';

@Injectable()
export class RoomsService {
  private readonly rooms = new Map<string, RoomEntity>();
  constructor(private readonly postgresService: PostgresService) {}

  createRoom(hostUserId: string) {
    if (this.postgresService.isEnabled()) {
      const created = this.postgresService.createRoom({
        code: this.generateCode(),
        hostUserId,
        status: 'waiting',
        mode: 'battle',
        difficulty: 'normal',
        durationMinutes: 3,
        warriorMode: false,
      });
      return this.toRoomEntity(created);
    }

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
    if (this.postgresService.isEnabled()) {
      const room = this.postgresService.updateRoomGuest(code, guestUserId);
      if (!room) {
        throw new NotFoundException('Salon introuvable.');
      }
      return this.toRoomEntity(room);
    }

    const room = this.findOne(code);
    room.guestUserId = guestUserId;
    this.rooms.set(code, room);
    return room;
  }

  updateOptions(code: string, options: Partial<RoomOptions>) {
    if (this.postgresService.isEnabled()) {
      const room = this.postgresService.updateRoomOptions(code, {
        mode: options.mode,
        difficulty: options.difficulty,
        durationMinutes: options.durationInMinutes,
        warriorMode: options.warriorMode,
      });
      if (!room) {
        throw new NotFoundException('Salon introuvable.');
      }
      return this.toRoomEntity(room);
    }

    const room = this.findOne(code);
    room.options = { ...room.options, ...options };
    this.rooms.set(code, room);
    return room;
  }

  findOne(code: string) {
    if (this.postgresService.isEnabled()) {
      const room = this.postgresService.findRoomByCode(code.toUpperCase());
      if (!room) {
        throw new NotFoundException('Salon introuvable.');
      }
      return this.toRoomEntity(room);
    }

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

  private toRoomEntity(room: {
    code: string;
    host_user_id: string;
    guest_user_id: string | null;
    status: 'waiting' | 'playing' | 'finished';
    mode: 'battle' | 'quiz';
    difficulty: 'easy' | 'normal' | 'expert';
    duration_minutes: 1 | 2 | 3 | 5 | 10;
    warrior_mode: boolean;
    created_at: string;
  }): RoomEntity {
    return {
      code: room.code,
      hostUserId: room.host_user_id,
      guestUserId: room.guest_user_id ?? undefined,
      status: room.status,
      options: {
        mode: room.mode,
        difficulty: room.difficulty,
        durationInMinutes: room.duration_minutes,
        warriorMode: room.warrior_mode,
      },
      createdAt: room.created_at,
    };
  }
}
