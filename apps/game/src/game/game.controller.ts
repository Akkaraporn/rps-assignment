import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isUUID } from 'class-validator';
import type { Request, Response } from 'express';
import type { PlayResponse, SessionResponse } from '@rps/shared';
import { GameService } from './game.service.js';
import { PlayDto } from './play.dto.js';
import { UserNotFoundError } from './score.client.js';

const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

@Controller()
export class GameController {
  constructor(
    private readonly game: GameService,
    private readonly config: ConfigService,
  ) {}

  @Get('session')
  session(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    return this.withUser(req, res, (userId) => this.game.getSession(userId));
  }

  @Post('play')
  play(
    @Body() dto: PlayDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PlayResponse> {
    return this.withUser(req, res, (userId) => this.game.play(userId, dto.move));
  }

  private async withUser<T>(
    req: Request,
    res: Response,
    action: (userId: string) => Promise<T>,
  ): Promise<T> {
    const cookieName = this.config.getOrThrow<string>('SESSION_COOKIE_NAME');
    const existing = req.cookies?.[cookieName] as string | undefined;

    if (existing && isUUID(existing)) {
      try {
        return await action(existing);
      } catch (error) {
        if (!(error instanceof UserNotFoundError)) throw error;
      }
    }

    const userId = await this.game.createGuest();
    res.cookie(cookieName, userId, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE_MS,
    });
    return action(userId);
  }
}