import { describe, expect, it, vi } from 'vitest';
import type { ApplyScoreRequest, ScoreSnapshot } from '@rps/shared';
import { GameService } from './game.service.js';
import { ScoreClient, UserNotFoundError } from './score.client.js';

vi.mock('./rules.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./rules.js')>()),
  randomMove: () => 'SCISSORS',
}));

class FakeScoreClient extends ScoreClient {
  readonly calls: Array<{ userId: string; round: ApplyScoreRequest }> = [];

  constructor(private readonly reply: ScoreSnapshot | Error) {
    super();
  }

  async applyRound(userId: string, round: ApplyScoreRequest): Promise<ScoreSnapshot> {
    this.calls.push({ userId, round });
    if (this.reply instanceof Error) throw this.reply;
    return this.reply;
  }
}

describe('GameService', () => {
  it('ตัดสินผลแล้วส่งให้ score client บันทึก', async () => {
    const scores = new FakeScoreClient({ currentScore: 3, bestScore: 5, highScore: 8 });
    const game = new GameService(scores);

    const response = await game.play('user-1', 'ROCK');

    expect(scores.calls).toEqual([
      { userId: 'user-1', round: { playerMove: 'ROCK', botMove: 'SCISSORS', result: 'WIN' } },
    ]);
    expect(response).toEqual({playerMove: "ROCK", botMove: 'SCISSORS', result: 'WIN', currentScore: 3, highScore: 8 });
  });

  it('ไม่ส่ง bestScore ออกไปให้ browser', async () => {
    const game = new GameService(new FakeScoreClient({ currentScore: 0, bestScore: 5, highScore: 8 }));

    const response = await game.play('user-1', 'PAPER');

    expect(response).not.toHaveProperty('bestScore');
  });

  it('user ไม่มีในระบบ → ส่ง error ต่อให้ gateway จัดการ', async () => {
    const game = new GameService(new FakeScoreClient(new UserNotFoundError()));

    await expect(game.play('ghost', 'ROCK')).rejects.toBeInstanceOf(UserNotFoundError);
  });
});