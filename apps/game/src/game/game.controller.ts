import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { PlayResponse, SessionResponse } from '@rps/shared';
import { GameService } from './game.service.js';
import { PlayDto } from './play.dto.js';

@Controller()
export class GameController {
  constructor(
    private readonly game: GameService,
    private readonly config: ConfigService,
  ) {}

  @Get('session')
  async session(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    return this.game.getSession(this.sessionId(req, res));
  }

  @Post('play')
  async play(
    @Body() dto: PlayDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PlayResponse> {
    return this.game.play(this.sessionId(req, res), dto.move);
  }

  private sessionId(req: Request, res: Response): string {
    const name = this.config.getOrThrow<string>('SESSION_COOKIE_NAME');
    const existing = req.cookies?.[name] as string | undefined;
    if (existing) return existing;

    const id = randomUUID();
    res.cookie(name, id, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 30,
    });
    return id;
  }
}