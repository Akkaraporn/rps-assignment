import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Redis } from 'ioredis';
import { REDIS } from '../redis/redis.module.js';

const FIXED_WINDOW_HIT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count`;

@Injectable()
export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private readonly playIntervalMs: number;
  private readonly guestLimit: number;
  private readonly guestWindowMs: number;

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    config: ConfigService,
  ) {
    this.playIntervalMs = Number(config.get('PLAY_MIN_INTERVAL_MS') ?? 1500);
    this.guestLimit = Number(config.get('GUEST_CREATE_LIMIT') ?? 20);
    this.guestWindowMs = Number(config.get('GUEST_CREATE_WINDOW_MS') ?? 60000);
  }

  async assertCanPlay(userId: string): Promise<void> {
    const allowed = await this.checkSafely(async () => {
      const result = await this.redis.set(`rl:play:${userId}`, '1', 'PX', this.playIntervalMs, 'NX');
      return result === 'OK';
    });
    if (!allowed) throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
  }

  async assertCanCreateGuest(ip: string): Promise<void> {
    const allowed = await this.checkSafely(async () => {
      const count = await this.redis.eval(FIXED_WINDOW_HIT, 1, `rl:guest:${ip}`, this.guestWindowMs);
      return Number(count) <= this.guestLimit;
    });
    if (!allowed) throw new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS);
  }

  private async checkSafely(check: () => Promise<boolean>): Promise<boolean> {
    try {
      return await check();
    } catch (error) {
      this.logger.warn(`Rate limiter unavailable, allowing request: ${(error as Error).message}`);
      return true;
    }
  }
}