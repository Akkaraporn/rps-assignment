import { useGame } from './hooks/useGame';
import { ScoreBoard } from './components/ScoreBoard';
import { MoveButtons } from './components/MoveButtons';
import './styles/main.scss';

export default function App() {
  const { phase, playerMove, botMove, result, currentScore, highScore, error, choose } = useGame();
  return (
    <main className="app">
      <h1 className="app__title">Rock Paper Scissors</h1>

      <ScoreBoard
        currentScore={currentScore}
        highScore={highScore}
        botMove={botMove}
        result={result}
      />

      <MoveButtons disabled={phase !== 'idle'} selected={playerMove} onChoose={choose} />
      {error && <p className="app__error">{error}</p>}
    </main>
  );
}