import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import type { Request, Response } from 'express';
import type { GuestUserResponse } from '@rps/shared';
import { RateLimiter } from '../rate-limit/rate-limiter.service.js';
import { UpstreamClient } from '../upstream/upstream.client.js';
import { UserNotFoundError } from '../upstream/user-not-found.error.js';

const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

@Injectable()
export class SessionService {
  private readonly cookieName: string;
  private readonly userServiceUrl: string;
  private readonly cookieSecure: boolean;

  constructor(
    config: ConfigService,
    private readonly upstream: UpstreamClient,
    private readonly limiter: RateLimiter,
  ) {
    this.cookieName = config.getOrThrow<string>('SESSION_COOKIE_NAME');
    this.userServiceUrl = config.getOrThrow<string>('USER_SERVICE_URL');
    this.cookieSecure = config.get('COOKIE_SECURE') === 'true';
  }

  async withUser<T>(req: Request, res: Response, action: (userId: string) => Promise<T>): Promise<T> {
    const existing = this.readUserId(req);

    if (existing) {
      try {
        return await action(existing);
      } catch (error) {
        if (!(error instanceof UserNotFoundError)) throw error;
      }
    }

    const userId = await this.createGuest(req.ip ?? 'unknown');
    res.cookie(this.cookieName, userId, {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
      secure: this.cookieSecure,
    });
    return action(userId);
  }

  private readUserId(req: Request): string | null {
    const value: unknown = req.signedCookies?.[this.cookieName];
    return typeof value === 'string' && isUUID(value) ? value : null;
  }

  private async createGuest(ip: string): Promise<string> {
    await this.limiter.assertCanCreateGuest(ip);
    const { userId } = await this.upstream.request<GuestUserResponse>(
      this.userServiceUrl,
      'POST',
      '/internal/users/guest',
    );
    return userId;
  }
  
}