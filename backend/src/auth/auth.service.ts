import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';

interface LoginPayload {
  email: string;
  password: string;
}

interface RegisterPayload {
  email: string;
  pseudo: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  register(payload: RegisterPayload) {
    const user = this.usersService.create(payload.email, payload.pseudo, payload.password);
    const accessToken = user.id;
    const refreshToken = this.generateRefreshToken();
    this.usersService.setRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  login(payload: LoginPayload) {
    const user = this.usersService.findByEmail(payload.email);
    if (!user || !this.usersService.comparePassword(payload.password, user.passwordHash)) {
      throw new UnauthorizedException('Email ou mot de passe invalide.');
    }

    const accessToken = user.id;
    const refreshToken = this.generateRefreshToken();
    this.usersService.setRefreshToken(user.id, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.usersService.toPublic(user),
    };
  }

  refreshToken(refreshToken: string) {
    const user = this.findByRefreshToken(refreshToken);
    const newRefreshToken = this.generateRefreshToken();
    this.usersService.setRefreshToken(user.id, newRefreshToken);

    return {
      accessToken: user.id,
      refreshToken: newRefreshToken,
      user: this.usersService.toPublic(user),
    };
  }

  logout(userId: string) {
    this.usersService.clearRefreshToken(userId);
  }

  private findByRefreshToken(refreshToken: string) {
    const user = this.usersService.findByRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedException('Refresh token invalide.');
    }

    return user;
  }

  private generateRefreshToken() {
    return randomUUID();
  }
}
