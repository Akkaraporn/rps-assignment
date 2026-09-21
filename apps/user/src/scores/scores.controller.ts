import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type { ScoreSnapshot } from '@rps/shared';
import { ApplyScoreDto } from './apply-score.dto.js';
import { ScoresService } from './scores.service.js';

@Controller('internal/scores')
export class ScoresController {
  constructor(private readonly scores: ScoresService) {}

  @Get(':userId')
  get(@Param('userId', ParseUUIDPipe) userId: string): Promise<ScoreSnapshot> {
    return this.scores.get(userId);
  }

  @Post(':userId/apply')
  @HttpCode(200)
  apply(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: ApplyScoreDto,
  ): Promise<ScoreSnapshot> {
    return this.scores.apply(userId, dto);
  }
}