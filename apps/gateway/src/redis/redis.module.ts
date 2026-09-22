import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('Redis');
        const client = new Redis(config.getOrThrow<string>('REDIS_URL'), {
          lazyConnect: true,
          enableOfflineQueue: false,
        });
        client.on('error', (error) => logger.warn(error.message));
        await client.connect().catch((error: Error) => logger.warn(`Initial connect failed: ${error.message}`));
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}