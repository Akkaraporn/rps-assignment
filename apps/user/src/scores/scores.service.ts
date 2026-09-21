import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type pg from 'pg';
import type { ApplyScoreRequest, ScoreSnapshot } from '@rps/shared';
import { PG_POOL } from '../database/database.module.js';
import { withTransaction } from '../database/transaction.js';
import { ScoresRepository } from './scores.repository.js';

@Injectable()
export class ScoresService {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    private readonly repo: ScoresRepository,
  ) {}

  apply(userId: string, round: ApplyScoreRequest): Promise<ScoreSnapshot> {
    return withTransaction(this.pool, async (tx) => {
      const score = await this.repo.applyResult(tx, userId, round.result);
      if (!score) throw new NotFoundException('User not found');

      await this.repo.insertRound(tx, userId, round);
      const highScore = await this.repo.getHighScore(tx);
      return { ...score, highScore };
    });
  }

  async get(userId: string): Promise<ScoreSnapshot> {
    const score = await this.repo.getScore(this.pool, userId);
    if (!score) throw new NotFoundException('User not found');
    return { ...score, highScore: await this.repo.getHighScore(this.pool) };
  }
}