import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module.js';
import { UsersModule } from './users/users.module.js';
import { ScoresModule } from './scores/scores.module.js';
import { RedisModule } from './redis/redis.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env'],
    }),
    DatabaseModule,
    UsersModule,
    ScoresModule,
    RedisModule,
  ],
})
export class AppModule {}