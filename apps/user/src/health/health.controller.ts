import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type pg from 'pg';
import { probe, toHealthReport, type HealthReport } from '@rps/shared';
import { Public } from '../common/public.decorator.js';
import { PG_POOL } from '../database/database.module.js';
import { REDIS } from '../redis/redis.module.js';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  @Public()
  @Get()
  async check(): Promise<HealthReport> {
    const [postgres, redis] = await Promise.all([
      probe(() => this.pool.query('SELECT 1')),
      probe(() => this.redis.ping()),
    ]);
    const report = toHealthReport({ postgres, redis });
    if (report.status !== 'ok') throw new ServiceUnavailableException(report);
    return report;
  }
}