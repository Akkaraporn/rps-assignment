import { Injectable } from '@nestjs/common';
import type { Move, PlayResponse } from '@rps/shared';
import { judge, randomMove } from './rules.js';
import { ScoreClient } from './score.client.js';

@Injectable()
export class GameService {
  constructor(private readonly scores: ScoreClient) {}

  async play(userId: string, playerMove: Move): Promise<PlayResponse> {
    const botMove = randomMove();
    const result = judge(playerMove, botMove);

    const { currentScore, highScore } = await this.scores.applyRound(userId, {
      playerMove,
      botMove,
      result,
    });

    return { playerMove, botMove, result, currentScore, highScore };
  }
}