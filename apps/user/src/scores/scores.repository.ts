import { Injectable } from '@nestjs/common';
import type pg from 'pg';
import type { ApplyScoreRequest, RoundResult } from '@rps/shared';

type Queryable = pg.Pool | pg.PoolClient;

interface ScoreRow {
  current_score: number;
  best_score: number;
}

export interface PlayerScore {
  currentScore: number;
  bestScore: number;
}

const APPLY_RESULT_SQL = `
  UPDATE player_scores
  SET current_score = CASE $2::text
        WHEN 'WIN'  THEN current_score + 1
        WHEN 'LOSE' THEN 0
        ELSE current_score
      END,
      best_score = CASE $2::text
        WHEN 'WIN' THEN GREATEST(best_score, current_score + 1)
        ELSE best_score
      END,
      updated_at = now()
  WHERE user_id = $1
  RETURNING current_score, best_score`;

const INSERT_ROUND_SQL = `
  INSERT INTO rounds (user_id, player_move, bot_move, result)
  VALUES ($1, $2, $3, $4)`;

const GET_SCORE_SQL = `
  SELECT current_score, best_score FROM player_scores WHERE user_id = $1`;

const GET_HIGH_SCORE_SQL = `
  SELECT COALESCE(MAX(best_score), 0) AS high_score FROM player_scores`;

@Injectable()
export class ScoresRepository {
  async applyResult(db: Queryable, userId: string, result: RoundResult): Promise<PlayerScore | null> {
    const { rows } = await db.query<ScoreRow>(APPLY_RESULT_SQL, [userId, result]);
    return rows[0] ? toPlayerScore(rows[0]) : null;
  }

  async insertRound(db: Queryable, userId: string, round: ApplyScoreRequest): Promise<void> {
    await db.query(INSERT_ROUND_SQL, [userId, round.playerMove, round.botMove, round.result]);
  }

  async getScore(db: Queryable, userId: string): Promise<PlayerScore | null> {
    const { rows } = await db.query<ScoreRow>(GET_SCORE_SQL, [userId]);
    return rows[0] ? toPlayerScore(rows[0]) : null;
  }

  async getHighScore(db: Queryable): Promise<number> {
    const { rows } = await db.query<{ high_score: number }>(GET_HIGH_SCORE_SQL);
    return rows[0].high_score;
  }
}

function toPlayerScore(row: ScoreRow): PlayerScore {
  return { currentScore: row.current_score, bestScore: row.best_score };
}