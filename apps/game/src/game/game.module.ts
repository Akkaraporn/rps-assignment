import { Module } from '@nestjs/common';
import { GameController } from './game.controller.js';
import { GameService } from './game.service.js';
import { ScoreStore } from './score.store.js';

@Module({
  controllers: [GameController],
  providers: [GameService, ScoreStore],
})
export class GameModule {}