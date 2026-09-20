import { judge, nextScore, randomMove } from './rules';
import { MOVES, type Move } from '@rps/shared';

describe('judge', () => {
  it.each(MOVES)('%s Draw', (move) => {
    expect(judge(move, move)).toBe('DRAW');
  });

  it.each([
    ['ROCK', 'SCISSORS'],
    ['PAPER', 'ROCK'],
    ['SCISSORS', 'PAPER'],
  ] as [Move, Move][])('%s win %s', (player, bot) => {
    expect(judge(player, bot)).toBe('WIN');
    expect(judge(bot, player)).toBe('LOSE');
  });
});

describe('nextScore', () => {
  it('Win to be 5', () => expect(nextScore(4, 'WIN')).toBe(5));
  it('Lose to be 0', () => expect(nextScore(9, 'LOSE')).toBe(0));
  it('Draw', () => expect(nextScore(3, 'DRAW')).toBe(3));
});

describe('randomMove', () => {
  it('alway return MOVES ', () => {
    for (let i = 0; i < 100; i++) expect(MOVES).toContain(randomMove());
  });

  it('use all Moves when have multiples randoms', () => {
    const seen = new Set(Array.from({ length: 300 }, randomMove));
    expect(seen.size).toBe(3);
  });
});