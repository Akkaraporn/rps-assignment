export const MOVES = ['ROCK', 'PAPER', 'SCISSORS'] as const;
export type Move = (typeof MOVES)[number];

export const ROUND_RESULTS = ['WIN', 'LOSE', 'DRAW'] as const;
export type RoundResult = (typeof ROUND_RESULTS)[number];

export function isMove(value: unknown): value is Move {
  return typeof value === 'string' && (MOVES as readonly string[]).includes(value);
}