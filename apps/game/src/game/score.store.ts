import { Inject, Injectable } from '@nestjs/common';
import { REDIS } from '../redis/redis.module.js';
import type { Redis } from 'ioredis';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const HIGH_SCORE_KEY = 'global:high_score';

const BUMP_HIGH_SCORE = `
local cur = tonumber(redis.call('GET', KEYS[1]) or '0')
local candidate = tonumber(ARGV[1])
if candidate > cur then
  redis.call('SET', KEYS[1], candidate)
  return candidate
end
return cur`;

@Injectable()
export class ScoreStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async getCurrent(sessionId: string): Promise<number> {
    const raw = await this.redis.get(this.key(sessionId));
    return raw ? Number(raw) : 0;
  }

  async setCurrent(sessionId: string, score: number): Promise<void> {
    await this.redis.set(this.key(sessionId), score, 'EX', SESSION_TTL_SECONDS);
  }

  async getHighScore(): Promise<number> {
    const raw = await this.redis.get(HIGH_SCORE_KEY);
    return raw ? Number(raw) : 0;
  }

  async bumpHighScore(candidate: number): Promise<number> {
    const result = await this.redis.eval(BUMP_HIGH_SCORE, 1, HIGH_SCORE_KEY, candidate);
    return Number(result);
  }

  private key(sessionId: string): string {
    return `score:${sessionId}`;
  }
}