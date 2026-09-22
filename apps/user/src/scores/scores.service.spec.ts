import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import type pg from 'pg';
import { ERROR_CODES, type ApplyScoreRequest } from '@rps/shared';
import type { HighScorePublisher } from './high-score.publisher.js';
import type { ScoresRepository } from './scores.repository.js';
import { ScoresService } from './scores.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const ROUND: ApplyScoreRequest = { playerMove: 'ROCK', botMove: 'SCISSORS', result: 'WIN' };

describe('ScoresService.apply', () => {
  const client = { query: vi.fn(), release: vi.fn() };
  const pool = { connect: vi.fn() };
  const repo = {
    applyResult: vi.fn(),
    insertRound: vi.fn(),
    getHighScore: vi.fn(),
  };
  const publisher = { publishIfRaised: vi.fn(), reset: vi.fn() };
  let service: ScoresService;

  beforeEach(() => {
    vi.resetAllMocks();
    client.query.mockResolvedValue({});
    pool.connect.mockResolvedValue(client);
    repo.getHighScore.mockResolvedValue(7);
    service = new ScoresService(
      pool as unknown as pg.Pool,
      repo as unknown as ScoresRepository,
      publisher as unknown as HighScorePublisher,
    );
  });

  it('บันทึกคะแนนกับประวัติใน transaction เดียว แล้วประกาศหลัง commit', async () => {
    repo.applyResult.mockResolvedValue({ currentScore: 7, bestScore: 7 });

    await expect(service.apply(USER_ID, ROUND)).resolves.toEqual({
      currentScore: 7,
      bestScore: 7,
      highScore: 7,
    });

    expect(repo.insertRound).toHaveBeenCalledWith(client, USER_ID, ROUND);

    const commitOrder = client.query.mock.invocationCallOrder[
      client.query.mock.calls.findIndex(([sql]) => sql === 'COMMIT')
    ];
    expect(commitOrder).toBeDefined();
    expect(publisher.publishIfRaised.mock.invocationCallOrder[0]).toBeGreaterThan(commitOrder);
    expect(publisher.publishIfRaised).toHaveBeenCalledWith(7);
    expect(client.release).toHaveBeenCalledOnce();
  });

  it('user ไม่มีในระบบ → rollback, ไม่บันทึกประวัติ, ไม่ประกาศ และตอบ USER_NOT_FOUND', async () => {
    repo.applyResult.mockResolvedValue(null);

    const error = await service.apply(USER_ID, ROUND).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).getResponse()).toMatchObject({
      code: ERROR_CODES.USER_NOT_FOUND,
    });
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(repo.insertRound).not.toHaveBeenCalled();
    expect(publisher.publishIfRaised).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledOnce();
  });
});