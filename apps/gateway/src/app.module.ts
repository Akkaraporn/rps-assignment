import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiController } from './api/api.controller.js';
import { SessionService } from './session/session.service.js';
import { UpstreamClient } from './upstream/upstream.client.js';
import { RealtimeModule } from './realtime/realtime.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env'] }),
    RealtimeModule
  ],
  controllers: [ApiController],
  providers: [SessionService, UpstreamClient],
})
export class AppModule {}