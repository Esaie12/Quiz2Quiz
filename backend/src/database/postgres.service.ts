import { Injectable, Logger } from '@nestjs/common';
import { execFileSync } from 'child_process';

export interface DbUser {
  id: string;
  email: string;
  pseudo: string;
  password_hash: string;
  refresh_token: string | null;
}

export interface DbRoom {
  code: string;
  host_user_id: string;
  guest_user_id: string | null;
  status: 'waiting' | 'playing' | 'finished';
  mode: 'battle' | 'quiz';
  difficulty: 'easy' | 'normal' | 'expert';
  duration_minutes: 1 | 2 | 3 | 5 | 10;
  warrior_mode: boolean;
  created_at: string;
}

@Injectable()
export class PostgresService {
  private readonly logger = new Logger(PostgresService.name);
  private readonly dbUrl = process.env.DATABASE_URL;
  private readonly enabled = process.env.USE_POSTGRES === 'true' && Boolean(this.dbUrl);

  isEnabled() {
    return this.enabled;
  }

  migrate(): void {
    if (!this.enabled || !this.dbUrl) return;

    const sql = [
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
      `CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        pseudo TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        refresh_token TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
      `CREATE TABLE IF NOT EXISTS rooms (
        code VARCHAR(6) PRIMARY KEY,
        host_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        guest_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        mode TEXT NOT NULL DEFAULT 'battle',
        difficulty TEXT NOT NULL DEFAULT 'normal',
        duration_minutes INT NOT NULL DEFAULT 3,
        warrior_mode BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,
    ].join('\n');

    this.run(sql);
    this.logger.log('PostgreSQL migration exécutée.');
  }

  findUserByEmail(email: string): DbUser | undefined {
    return this.one<DbUser>(
      `SELECT id,email,pseudo,password_hash,refresh_token FROM users WHERE email='${this.escape(email)}' LIMIT 1;`,
    );
  }

  findUserById(id: string): DbUser | undefined {
    return this.one<DbUser>(
      `SELECT id,email,pseudo,password_hash,refresh_token FROM users WHERE id='${this.escape(id)}' LIMIT 1;`,
    );
  }

  findUserByPseudo(pseudo: string): DbUser | undefined {
    return this.one<DbUser>(
      `SELECT id,email,pseudo,password_hash,refresh_token FROM users WHERE pseudo='${this.escape(pseudo)}' LIMIT 1;`,
    );
  }

  findUserByRefreshToken(refreshToken: string): DbUser | undefined {
    return this.one<DbUser>(
      `SELECT id,email,pseudo,password_hash,refresh_token FROM users WHERE refresh_token='${this.escape(refreshToken)}' LIMIT 1;`,
    );
  }

  createUser(email: string, pseudo: string, passwordHash: string): DbUser {
    const query = `INSERT INTO users (email,pseudo,password_hash)
      VALUES ('${this.escape(email)}','${this.escape(pseudo)}','${this.escape(passwordHash)}')
      RETURNING id,email,pseudo,password_hash,refresh_token;`;

    const result = this.one<DbUser>(query);
    if (!result) {
      throw new Error('Impossible de créer l\'utilisateur PostgreSQL.');
    }
    return result;
  }

  setRefreshToken(userId: string, refreshToken: string | null): void {
    this.run(
      `UPDATE users SET refresh_token=${refreshToken ? `'${this.escape(refreshToken)}'` : 'NULL'} WHERE id='${this.escape(userId)}';`,
    );
  }

  createRoom(payload: {
    code: string;
    hostUserId: string;
    status: 'waiting' | 'playing' | 'finished';
    mode: 'battle' | 'quiz';
    difficulty: 'easy' | 'normal' | 'expert';
    durationMinutes: 1 | 2 | 3 | 5 | 10;
    warriorMode: boolean;
  }): DbRoom {
    const query = `INSERT INTO rooms (code,host_user_id,status,mode,difficulty,duration_minutes,warrior_mode)
      VALUES ('${this.escape(payload.code)}','${this.escape(payload.hostUserId)}','${payload.status}','${payload.mode}','${payload.difficulty}',${payload.durationMinutes},${payload.warriorMode})
      RETURNING code,host_user_id,guest_user_id,status,mode,difficulty,duration_minutes,warrior_mode,created_at;`;
    const room = this.one<DbRoom>(query);
    if (!room) throw new Error('Impossible de créer le salon PostgreSQL.');
    return room;
  }

  findRoomByCode(code: string): DbRoom | undefined {
    return this.one<DbRoom>(
      `SELECT code,host_user_id,guest_user_id,status,mode,difficulty,duration_minutes,warrior_mode,created_at FROM rooms WHERE code='${this.escape(code)}' LIMIT 1;`,
    );
  }

  updateRoomGuest(code: string, guestUserId: string): DbRoom | undefined {
    return this.one<DbRoom>(
      `UPDATE rooms SET guest_user_id='${this.escape(guestUserId)}' WHERE code='${this.escape(code)}'
      RETURNING code,host_user_id,guest_user_id,status,mode,difficulty,duration_minutes,warrior_mode,created_at;`,
    );
  }

  updateRoomOptions(
    code: string,
    options: Partial<{ mode: 'battle' | 'quiz'; difficulty: 'easy' | 'normal' | 'expert'; durationMinutes: 1 | 2 | 3 | 5 | 10; warriorMode: boolean }>,
  ): DbRoom | undefined {
    const clauses: string[] = [];
    if (options.mode) clauses.push(`mode='${options.mode}'`);
    if (options.difficulty) clauses.push(`difficulty='${options.difficulty}'`);
    if (options.durationMinutes) clauses.push(`duration_minutes=${options.durationMinutes}`);
    if (typeof options.warriorMode === 'boolean') clauses.push(`warrior_mode=${options.warriorMode}`);

    if (clauses.length === 0) return this.findRoomByCode(code);

    return this.one<DbRoom>(
      `UPDATE rooms SET ${clauses.join(', ')} WHERE code='${this.escape(code)}'
      RETURNING code,host_user_id,guest_user_id,status,mode,difficulty,duration_minutes,warrior_mode,created_at;`,
    );
  }

  private run(sql: string): string {
    if (!this.enabled || !this.dbUrl) {
      return '';
    }

    return execFileSync('psql', [this.dbUrl, '-q', '-t', '-A', '-F', '|', '-c', sql], {
      encoding: 'utf8',
    });
  }

  private one<T>(sql: string): T | undefined {
    const raw = this.run(sql).trim();
    if (!raw) return undefined;

    const lastLine = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => Boolean(line) && line.includes('|'))
      .at(-1);
    if (!lastLine) return undefined;

    const values = lastLine.split('|');
    const selectPart = sql.toLowerCase().includes('returning')
      ? sql.split(/returning/i)[1]
      : sql.split(/select/i)[1].split(/from/i)[0];
    const columns = selectPart
      .split(',')
      .map((column) => column.trim().replace(/\s+/g, ''))
      .map((column) => column.replace(/"/g, ''));

    const mapped = Object.fromEntries(
      columns.map((column, index) => [column, values[index] === '' ? null : values[index]]),
    ) as T;

    return mapped;
  }

  private escape(value: string): string {
    return value.replace(/'/g, "''");
  }
}
