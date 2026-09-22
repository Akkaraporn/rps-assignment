import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiController } from './api/api.controller.js';
import { RateLimiter } from './rate-limit/rate-limiter.service.js';
import { RealtimeModule } from './realtime/realtime.module.js';
import { RedisModule } from './redis/redis.module.js';
import { SessionService } from './session/session.service.js';
import { UpstreamClient } from './upstream/upstream.client.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
    RedisModule,
    RealtimeModule,
  ],
  controllers: [ApiController],
  providers: [SessionService, UpstreamClient, RateLimiter],
})
export class AppModule {}