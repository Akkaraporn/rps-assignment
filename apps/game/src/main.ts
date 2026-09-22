import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { InternalTokenGuard } from './common/internal-token.guard.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('internal');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('internal', { exclude: ['health'] });
  app.useGlobalGuards(new InternalTokenGuard(config, app.get(Reflector)));
  await app.listen(config.get<number>('GAME_PORT') ?? 3001);
}
void bootstrap();