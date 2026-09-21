import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import type { PlayResponse } from '@rps/shared';
import { UserId } from '../common/user-id.decorator.js';
import { GameService } from './game.service.js';
import { PlayDto } from './play.dto.js';

@Controller()
export class GameController {
  constructor(private readonly game: GameService) {}

  @Post('play')
  @HttpCode(200)
  play(@UserId() userId: string, @Body() dto: PlayDto): Promise<PlayResponse> {
    return this.game.play(userId, dto.move);
  }
}