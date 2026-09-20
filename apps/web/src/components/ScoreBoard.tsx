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
          <dt>Your Score</dt>
          <dd>{currentScore} turn</dd>
        </div>
        <div>
          <dt>High Score</dt>
          <dd>{highScore} turn</dd>
        </div>
      </dl>

      <div className="scoreboard__bot">
        <span className="scoreboard__label">Bot action</span>
        <div className={`bot-card${result ? ` bot-card--${result.toLowerCase()}` : ''}`}>
          {botMove ?? '???'}
        </div>
      </div>
    </section>
  );
}