import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      service: 'quiz-battle-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
