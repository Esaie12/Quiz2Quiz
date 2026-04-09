import { Body, Controller, Headers, HttpCode, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(
    @Body() body: { email: string; pseudo: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = this.authService.register(body);
    this.attachRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('login')
  login(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = this.authService.login(body);
    this.attachRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @Post('refresh')
  refresh(
    @Headers('x-refresh-token') refreshToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = this.authService.refreshToken(refreshToken);
    this.attachRefreshCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
      user: result.user,
    };
  }

  @HttpCode(204)
  @Post('logout')
  logout(@Headers('authorization') authHeader: string, @Res({ passthrough: true }) res: Response) {
    const userId = (authHeader ?? '').replace('Bearer ', '').trim();
    this.authService.logout(userId);
    res.clearCookie('refreshToken');
  }

  private attachRefreshCookie(res: Response, refreshToken: string) {
    const secureCookie = process.env.COOKIE_SECURE === 'true';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      sameSite: 'strict',
      secure: secureCookie,
      maxAge: 7 * 24 * 3600 * 1000,
    });
  }
}
