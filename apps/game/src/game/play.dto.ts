import { IsIn } from 'class-validator';
import { MOVES, type Move, type PlayRequest } from '@rps/shared';

export class PlayDto implements PlayRequest {
  @IsIn(MOVES)
  move!: Move;
}