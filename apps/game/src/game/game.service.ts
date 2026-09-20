import { Injectable } from '@nestjs/common';
import type { Move, PlayResponse, SessionResponse } from '@rps/shared';
import { judge, nextScore, randomMove } from './rules.js';
import { ScoreStore } from './score.store.js';

@Injectable()
export class GameService {
  constructor(private readonly scores: ScoreStore) {}

  async play(sessionId: string, playerMove: Move): Promise<PlayResponse> {
    const botMove = randomMove();
    const result = judge(playerMove, botMove);

    const currentScore = nextScore(await this.scores.getCurrent(sessionId), result);
    await this.scores.setCurrent(sessionId, currentScore);
    const highScore = await this.scores.bumpHighScore(currentScore);

    return { playerMove, botMove, result, currentScore, highScore };
  }

  async getSession(sessionId: string): Promise<SessionResponse> {
    const [currentScore, highScore] = await Promise.all([
      this.scores.getCurrent(sessionId),
      this.scores.getHighScore(),
    ]);
    return { currentScore, highScore };
  }
}