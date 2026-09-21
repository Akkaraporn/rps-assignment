import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { GameModule } from './game/game.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'game',
    }),
    ConfigModule.forRoot({ isGlobal: true ,
                           envFilePath: ['../../.env'],}),
    GameModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}