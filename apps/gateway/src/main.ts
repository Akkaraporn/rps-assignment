import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { WsAdapter } from '@nestjs/platform-ws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.use(cookieParser(config.getOrThrow<string>('COOKIE_SECRET')));
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN'), credentials: true });
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(config.get<number>('GATEWAY_PORT') ?? 3000);
}
void bootstrap();