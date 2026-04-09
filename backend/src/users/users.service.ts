import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../common/types';
import { randomUUID, createHash } from 'crypto';

@Injectable()
export class UsersService {
  private readonly users = new Map<string, UserEntity>();

  create(email: string, pseudo: string, password: string): Omit<UserEntity, 'passwordHash' | 'refreshToken'> {
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
    return Array.from(this.users.values()).find((u) => u.email === email);
  }

  findByRefreshToken(refreshToken: string): UserEntity | undefined {
    return Array.from(this.users.values()).find((u) => u.refreshToken === refreshToken);
  }

  findById(id: string): UserEntity {
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
    const user = this.findById(userId);
    user.refreshToken = refreshToken;
    this.users.set(userId, user);
  }

  clearRefreshToken(userId: string): void {
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
