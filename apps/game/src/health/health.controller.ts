import { Controller, Get } from '@nestjs/common';
import { toHealthReport, type HealthReport } from '@rps/shared';
import { Public } from '../common/public.decorator.js';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  check(): HealthReport {
    return toHealthReport({});
  }
}