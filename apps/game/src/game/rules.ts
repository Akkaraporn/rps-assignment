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

export function nextScore(currentScore: number, result: RoundResult): number {
  if (result === 'WIN') return currentScore + 1;
  if (result === 'LOSE') return 0;
  return currentScore;
}