import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ERROR_CODES } from '@rps/shared';
import { UserNotFoundError } from './user-not-found.error.js';

interface RequestOptions {
  userId?: string;
  body?: unknown;
}

@Injectable()
export class UpstreamClient {
  private readonly logger = new Logger(UpstreamClient.name);
  private readonly token: string;
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    this.token = config.getOrThrow<string>('INTERNAL_TOKEN');
    this.timeoutMs = Number(config.get('UPSTREAM_TIMEOUT_MS') ?? 3000);
  }

  async request<T>(baseUrl: string, method: string, path: string, options: RequestOptions = {}): Promise<T> {
    const target = `${method} ${baseUrl}${path}`;
    let res: Response;

    try {
      res = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-token': this.token,
          ...(options.userId ? { 'x-user-id': options.userId } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      this.logger.error(`Upstream unreachable: ${target}`, (error as Error).stack);
      throw new ServiceUnavailableException('Service unavailable');
    }

    const payload: unknown = await res.json().catch(() => null);

    if (res.ok) return payload as T;
    if (isUserNotFound(payload)) throw new UserNotFoundError();
    if (res.status === 400) throw new BadRequestException(payload);

    this.logger.error(`Upstream responded ${res.status}: ${target}`);
    throw new ServiceUnavailableException('Service unavailable');
  }
}

function isUserNotFound(payload: unknown): boolean {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    (payload as { code?: unknown }).code === ERROR_CODES.USER_NOT_FOUND
  );
}