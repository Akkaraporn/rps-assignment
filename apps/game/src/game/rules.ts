import { MOVES, type Move, type RoundResult } from '@rps/shared';
import { randomInt } from 'node:crypto';

const BEATS: Record<Move, Move> = {
  ROCK: 'SCISSORS',
  PAPER: 'ROCK',
  SCISSORS: 'PAPER',
};

export function judge(playerMove: Move, botMove: Move): RoundResult {
  if (playerMove === botMove) return 'DRAW';
  return BEATS[playerMove] === botMove ? 'WIN' : 'LOSE';
}

export function randomMove(): Move {
  return MOVES[randomInt(0, MOVES.length)];
}
