import { IsIn } from 'class-validator';
import { MOVES, ROUND_RESULTS, type ApplyScoreRequest, type Move, type RoundResult } from '@rps/shared';

export class ApplyScoreDto implements ApplyScoreRequest {
  @IsIn(MOVES)
  playerMove!: Move;

  @IsIn(MOVES)
  botMove!: Move;

  @IsIn(ROUND_RESULTS)
  result!: RoundResult;
}