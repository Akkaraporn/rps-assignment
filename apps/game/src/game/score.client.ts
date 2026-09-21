import type { ApplyScoreRequest, ScoreSnapshot } from '@rps/shared';

export class UserNotFoundError extends Error {
  constructor(userId: string) {
    super(`User ${userId} not found`);
  }
}

export abstract class ScoreClient {
  abstract createGuest(): Promise<string>;
  abstract getScore(userId: string): Promise<ScoreSnapshot>;
  abstract applyRound(userId: string, round: ApplyScoreRequest): Promise<ScoreSnapshot>;
}