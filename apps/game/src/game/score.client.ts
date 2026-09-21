import { NotFoundException } from '@nestjs/common';
import { ERROR_CODES, type ApplyScoreRequest, type ScoreSnapshot } from '@rps/shared';

export class UserNotFoundError extends NotFoundException {
  constructor() {
    super({ code: ERROR_CODES.USER_NOT_FOUND, message: 'User not found' });
  }
}

export abstract class ScoreClient {
  abstract applyRound(userId: string, round: ApplyScoreRequest): Promise<ScoreSnapshot>;
}