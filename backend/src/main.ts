import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PostgresService } from './database/postgres.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4200';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.get(PostgresService).migrate();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
