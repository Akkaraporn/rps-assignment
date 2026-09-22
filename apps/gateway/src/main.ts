import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { WsAdapter } from '@nestjs/platform-ws';
import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {  
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.set('trust proxy', config.get('TRUST_PROXY') === 'true');
  app.use(cookieParser(config.getOrThrow<string>('COOKIE_SECRET')));
  app.enableCors({ origin: config.getOrThrow<string>('CORS_ORIGIN'), credentials: true });
  app.useWebSocketAdapter(new WsAdapter(app));
  await app.listen(config.get<number>('GATEWAY_PORT') ?? 3000);
}
void bootstrap();