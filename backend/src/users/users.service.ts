import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../common/types';
import { randomUUID, createHash } from 'crypto';
import { PostgresService } from '../database/postgres.service';

@Injectable()
export class UsersService {
  private readonly users = new Map<string, UserEntity>();
  constructor(private readonly postgresService: PostgresService) {}

  create(email: string, pseudo: string, password: string): Omit<UserEntity, 'passwordHash' | 'refreshToken'> {
    if (this.postgresService.isEnabled()) {
      if (this.postgresService.findUserByEmail(email) || this.postgresService.findUserByPseudo(pseudo)) {
        throw new ConflictException('Email ou pseudo déjà utilisé.');
      }

      const user = this.postgresService.createUser(email, pseudo, this.hash(password));
      return {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
      };
    }

    const exists = Array.from(this.users.values()).some(
      (u) => u.email === email || u.pseudo.toLowerCase() === pseudo.toLowerCase(),
    );

    if (exists) {
      throw new ConflictException('Email ou pseudo déjà utilisé.');
    }

    const user: UserEntity = {
      id: randomUUID(),
      email,
      pseudo,
      passwordHash: this.hash(password),
    };

    this.users.set(user.id, user);
    return this.toPublic(user);
  }

  findByEmail(email: string): UserEntity | undefined {
    if (this.postgresService.isEnabled()) {
      const user = this.postgresService.findUserByEmail(email);
      if (!user) return undefined;
      return {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        passwordHash: user.password_hash,
        refreshToken: user.refresh_token ?? undefined,
      };
    }
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  findByRefreshToken(refreshToken: string): UserEntity | undefined {
    if (this.postgresService.isEnabled()) {
      const user = this.postgresService.findUserByRefreshToken(refreshToken);
      if (!user) return undefined;
      return {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        passwordHash: user.password_hash,
        refreshToken: user.refresh_token ?? undefined,
      };
    }
    return Array.from(this.users.values()).find((u) => u.refreshToken === refreshToken);
  }

  findById(id: string): UserEntity {
    if (this.postgresService.isEnabled()) {
      const user = this.postgresService.findUserById(id);
      if (!user) {
        throw new NotFoundException('Utilisateur introuvable.');
      }
      return {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        passwordHash: user.password_hash,
        refreshToken: user.refresh_token ?? undefined,
      };
    }

    const user = this.users.get(id);
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return user;
  }

  comparePassword(rawPassword: string, hash: string): boolean {
    return this.hash(rawPassword) === hash;
  }

  setRefreshToken(userId: string, refreshToken: string): void {
    if (this.postgresService.isEnabled()) {
      this.postgresService.setRefreshToken(userId, refreshToken);
      return;
    }
    const user = this.findById(userId);
    user.refreshToken = refreshToken;
    this.users.set(userId, user);
  }

  clearRefreshToken(userId: string): void {
    if (this.postgresService.isEnabled()) {
      this.postgresService.setRefreshToken(userId, null);
      return;
    }
    const user = this.findById(userId);
    user.refreshToken = undefined;
    this.users.set(userId, user);
  }

  toPublic(user: UserEntity): Omit<UserEntity, 'passwordHash' | 'refreshToken'> {
    const { passwordHash: _ignoredPassword, refreshToken: _ignoredRefresh, ...publicUser } = user;
    return publicUser;
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
