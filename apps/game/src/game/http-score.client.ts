import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ApplyScoreRequest, GuestUserResponse, ScoreSnapshot } from '@rps/shared';
import { ScoreClient, UserNotFoundError } from './score.client.js';

@Injectable()
export class HttpScoreClient extends ScoreClient {
  private readonly logger = new Logger(HttpScoreClient.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    super();
    this.baseUrl = config.getOrThrow<string>('USER_SERVICE_URL');
    this.token = config.getOrThrow<string>('INTERNAL_TOKEN');
    this.timeoutMs = Number(config.get('USER_SERVICE_TIMEOUT_MS') ?? 3000);
  }

  applyRound(userId: string, round: ApplyScoreRequest): Promise<ScoreSnapshot> {
    return this.request<ScoreSnapshot>('POST', `/internal/scores/${userId}/apply`, round, userId);
  }

  private async request<T>(method: string, path: string, body?: unknown, userId?: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': this.token,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      this.logger.error(`User service unreachable: ${method} ${path}`, (error as Error).stack);
      throw new ServiceUnavailableException('User service unavailable');
    }

    if (res.status === 404 && userId) {
      throw new UserNotFoundError();
    }
    if (!res.ok) {
      this.logger.error(`User service responded ${res.status}: ${method} ${path}`);
      throw new ServiceUnavailableException('User service error');
    }
    return (await res.json()) as T;
  }
}