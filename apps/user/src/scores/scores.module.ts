import { Module } from '@nestjs/common';
import { HighScorePublisher } from './high-score.publisher.js';
import { ScoresController } from './scores.controller.js';
import { ScoresRepository } from './scores.repository.js';
import { ScoresService } from './scores.service.js';

@Module({
  controllers: [ScoresController],
  providers: [ScoresService, ScoresRepository, HighScorePublisher],
})
export class ScoresModule {}