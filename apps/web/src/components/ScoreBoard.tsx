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
      <div className="scoreboard__scores">
        <div className="score">
          <span className="score__label">Your Score</span>
          <span className="score__value" data-testid="your-score">{currentScore} turn</span>
        </div>
        <div className="score">
          <span className="score__label">High Score</span>
          <span className="score__value" data-testid="high-score">{highScore} turn</span>
        </div>
      </div>

      <div className="scoreboard__bot">
        <span className="scoreboard__label">Bot action</span>
        <div data-testid="bot-card" className={`bot-card${result ? ` bot-card--${result.toLowerCase()}` : ''}`}>
          {botMove ?? '???'}
        </div>
      </div>
    </section>
  );
}