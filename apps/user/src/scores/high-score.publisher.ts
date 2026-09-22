import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { HIGH_SCORE_CHANNEL, type HighScoreEvent } from '@rps/shared';
import { REDIS } from '../redis/redis.module.js';

const CACHE_KEY = 'rps:high-score';

const RAISE_AND_PUBLISH = `
local current = tonumber(redis.call('GET', KEYS[1]) or '0')
local candidate = tonumber(ARGV[1])
if candidate > current then
  redis.call('SET', KEYS[1], candidate)
  redis.call('PUBLISH', ARGV[2], ARGV[3])
  return 1
end
return 0`;

@Injectable()
export class HighScorePublisher {
  private readonly logger = new Logger(HighScorePublisher.name);

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async reset(highScore: number): Promise<void> {
    try {
      await this.redis.set(CACHE_KEY, highScore);
    } catch (error) {
      this.logger.warn(`Could not warm high score cache: ${(error as Error).message}`);
    }
  }

  async publishIfRaised(highScore: number): Promise<void> {
    const event: HighScoreEvent = { type: 'high_score', highScore };
    try {
      await this.redis.eval(
        RAISE_AND_PUBLISH,
        1,
        CACHE_KEY,
        highScore,
        HIGH_SCORE_CHANNEL,
        JSON.stringify(event),
      );
    } catch (error) {
      this.logger.warn(`Skipped high score broadcast: ${(error as Error).message}`);
    }
  }
}