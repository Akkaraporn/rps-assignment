import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { probe, toHealthReport, type HealthReport } from '@rps/shared';
import { REDIS } from '../redis/redis.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  @Get()
  async check(): Promise<HealthReport> {
    const report = toHealthReport({
      redis: await probe(() => this.redis.ping()),
    });
    if (report.status !== 'ok') throw new ServiceUnavailableException(report);
    return report;
  }
}