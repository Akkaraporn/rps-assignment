import { Inject, Injectable, NotFoundException, type OnApplicationBootstrap } from '@nestjs/common';
import type pg from 'pg';
import { ERROR_CODES, type ApplyScoreRequest, type ScoreSnapshot } from '@rps/shared';
import { PG_POOL } from '../database/database.module.js';
import { withTransaction } from '../database/transaction.js';
import { HighScorePublisher } from './high-score.publisher.js';
import { ScoresRepository } from './scores.repository.js';

@Injectable()
export class ScoresService implements OnApplicationBootstrap {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly repo: ScoresRepository,
    private readonly publisher: HighScorePublisher,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.publisher.reset(await this.repo.getHighScore(this.pool));
  }

  async apply(userId: string, round: ApplyScoreRequest): Promise<ScoreSnapshot> {
    const snapshot = await withTransaction(this.pool, async (tx) => {
      const score = await this.repo.applyResult(tx, userId, round.result);
      if (!score) throw new NotFoundException({ code: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });

      await this.repo.insertRound(tx, userId, round);
      const highScore = await this.repo.getHighScore(tx);
      return { ...score, highScore };
    });

    await this.publisher.publishIfRaised(snapshot.highScore);
    return snapshot;
  }

    async get(userId: string): Promise<ScoreSnapshot> {
    const score = await this.repo.getScore(this.pool, userId);
    if (!score) throw new NotFoundException({ code: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });
    return { ...score, highScore: await this.repo.getHighScore(this.pool) };
  }
}