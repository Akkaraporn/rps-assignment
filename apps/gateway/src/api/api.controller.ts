import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import type { PlayResponse, ScoreSnapshot, SessionResponse } from '@rps/shared';
import { SessionService } from '../session/session.service.js';
import { UpstreamClient } from '../upstream/upstream.client.js';

@Controller('api')
export class ApiController {
  private readonly gameServiceUrl: string;
  private readonly userServiceUrl: string;

  constructor(
    config: ConfigService,
    private readonly session: SessionService,
    private readonly upstream: UpstreamClient,
  ) {
    this.gameServiceUrl = config.getOrThrow<string>('GAME_SERVICE_URL');
    this.userServiceUrl = config.getOrThrow<string>('USER_SERVICE_URL');
  }

  @Get('session')
  getSession(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<SessionResponse> {
    return this.session.withUser(req, res, async (userId) => {
      const { currentScore, highScore } = await this.upstream.request<ScoreSnapshot>(
        this.userServiceUrl,
        'GET',
        `/internal/scores/${userId}`,
      );
      return { currentScore, highScore };
    });
  }

  @Post('play')
  @HttpCode(200)
  play(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<PlayResponse> {
    return this.session.withUser(req, res, (userId) =>
      this.upstream.request<PlayResponse>(this.gameServiceUrl, 'POST', '/internal/play', {
        userId,
        body,
      }),
    );
  }
}