import { Module } from '@nestjs/common';
import { GameController } from './game.controller.js';
import { GameService } from './game.service.js';
import { HttpScoreClient } from './http-score.client.js';
import { ScoreClient } from './score.client.js';

@Module({
  controllers: [GameController],
  providers: [GameService, { provide: ScoreClient, useClass: HttpScoreClient }],
})
export class GameModule {}