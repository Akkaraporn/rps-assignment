import type { Move, RoundResult } from '@rps/shared';

interface Props {
  currentScore: number;
  highScore: number;
  botMove: Move | null;
  result: RoundResult | null;
}

export function ScoreBoard({ currentScore, highScore, botMove, result }: Props) {
  return (
    <section className="scoreboard">
      <dl className="scoreboard__scores">
        <div>
          <dd data-testid="your-score">{currentScore} turn</dd>
          <dd data-testid="high-score">{highScore} turn</dd>
        </div>
        <div>
          <dt>High Score</dt>
          <dd>{highScore} turn</dd>
        </div>
      </dl>

      <div className="scoreboard__bot">
        <span className="scoreboard__label">Bot action</span>
        <div data-testid="bot-card" className={`bot-card${result ? ` bot-card--${result.toLowerCase()}` : ''}`}>
          {botMove ?? '???'}
        </div>
      </div>
    </section>
  );
}